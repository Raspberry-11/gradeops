"""
api_routes.py — GradeOps FastAPI Routes
Exposes the full pipeline over HTTP with RBAC enforcement.
"""

import json as _json
import logging
import shutil
import tempfile
import uuid
import os
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import csv
import io
from pydantic import BaseModel, ValidationError

from auth import require_instructor, require_ta_or_above
from database import UserORM
from background_tasks import task_manager, JobStatus
from config import settings
from models import (
    ExamBatch, GradeStatus, Rubric, RubricCriterion, TAReviewPayload
)
from pipeline import GradeOpsPipeline, PipelineConfig

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────
# Shared pipeline instance (singleton)
# ─────────────────────────────────────────────

_pipeline: GradeOpsPipeline | None = None


def get_pipeline() -> GradeOpsPipeline:
    global _pipeline
    if _pipeline is None:
        storage_kwargs: dict = {}
        if settings.storage_backend == "local":
            storage_kwargs = {"base_dir": settings.storage_data_dir}
        elif settings.storage_backend == "s3":
            storage_kwargs = {
                "bucket":       settings.aws_s3_bucket,
                "dynamo_table": settings.aws_dynamo_table,
                "region":       settings.aws_region,
            }

        cfg = PipelineConfig(
            ocr_backend=settings.ocr_backend,
            ocr_device=settings.ocr_device,
            ocr_dpi=settings.ocr_dpi,
            crop_dir=settings.ocr_crop_dir,
            gemini_api_key=settings.gemini_api_key,
            gemini_ocr_model=settings.gemini_ocr_model,
            llm_provider=settings.llm_provider,
            llm_model=settings.llm_model,
            llm_temp=settings.llm_temp,
            plagiarism_threshold=settings.plagiarism_threshold,
            use_embeddings=settings.plagiarism_embeddings,
            embedding_model=settings.embedding_model,
            storage_backend=settings.storage_backend,
            storage_kwargs=storage_kwargs,
        )
        _pipeline = GradeOpsPipeline(cfg)
    return _pipeline


# ─────────────────────────────────────────────
# Helper: parse rubrics from JSON string
# ─────────────────────────────────────────────

def _parse_rubrics(rubrics_json: str, exam_id: str) -> list[Rubric]:
    try:
        raw_data = _json.loads(rubrics_json)
        
        if isinstance(raw_data, dict) and "questions" in raw_data:
            raw_list = raw_data["questions"]
        elif isinstance(raw_data, dict):
            raw_list = [raw_data]
        elif isinstance(raw_data, list):
            raw_list = raw_data
        else:
            raise HTTPException(status_code=422, detail="Rubrics JSON must be a list or a dictionary")
            
        rubrics: list[Rubric] = []
        for raw in raw_list:
            raw = dict(raw)
            
            # Map flat text "rubric" to a single criterion if "criteria" list isn't provided
            if "rubric" in raw and isinstance(raw["rubric"], str) and "criteria" not in raw:
                criteria_data = [{
                    "criterion_id": f"c1_q{raw.get('question_number', '0')}",
                    "description": raw.pop("rubric"),
                    "max_points": raw.get("total_points", 0),
                    "partial_credit": True
                }]
            else:
                criteria_data = raw.pop("criteria", [])
                
            rubrics.append(Rubric(
                rubric_id=str(uuid.uuid4()),
                exam_id=exam_id,
                criteria=[RubricCriterion(**c) for c in criteria_data],
                **raw,
            ))
        return rubrics
    except ValidationError as e:
        # Simplify the error message for the frontend
        err_msgs = [f"{err['loc'][-1]}: {err['msg']}" for err in e.errors()]
        raise HTTPException(status_code=422, detail=f"Rubric missing fields: {', '.join(err_msgs)}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON format: {str(e)}")


# ─────────────────────────────────────────────
# Request body models
# ─────────────────────────────────────────────

class BulkApprovePayload(BaseModel):
    grade_ids: list[str]
    ta_id: str

class RubricGeneratePayload(BaseModel):
    extracted_text: str


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

# ── GET /exams  ───────────────────────────────
@router.get("/exams", summary="[Instructor] List all submitted exams")
async def list_exams(
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_instructor),
):
    try:
        batches = pipeline.storage.list_batches()
    except AttributeError:
        all_grades = pipeline.storage.load_grades(
            exam_id=None)  # type: ignore[arg-type]
        seen: dict[str, dict] = {}
        for g in all_grades:
            if g.exam_id not in seen:
                seen[g.exam_id] = {
                    "exam_id":       g.exam_id,
                    "course_id":     "—",
                    "student_count": 0,
                    "processed":     True,
                    "created_at":    None,
                }
            seen[g.exam_id]["student_count"] += 1
        batches = list(seen.values())
    return {"exams": batches}


# ── POST /rubrics/extract-text ──────────────────
@router.post("/rubrics/extract-text", summary="[Instructor] Extract text from Answer Key PDF (digital or scanned)")
async def extract_answer_key_text(
    pdf: UploadFile = File(...),
    pipeline: GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_instructor),
):
    import fitz
    tmp_dir = tempfile.mkdtemp(prefix="gradeops_key_")
    try:
        dest = os.path.join(tmp_dir, pdf.filename or f"{uuid.uuid4()}.pdf")
        content = await pdf.read()
        with open(dest, "wb") as fh:
            fh.write(content)

        # 1. Try digital text extraction first
        doc = fitz.open(dest)
        extracted_text = chr(12).join([page.get_text() for page in doc]).strip()
        doc.close()

        # 2. If no text found, it's likely scanned. Fallback to Vision OCR.
        if len(extracted_text) < 50:
            logger.info("No digital text found in Answer Key. Falling back to Vision OCR.")
            pages = pipeline.ocr._pdf_to_images(dest)
            ocr_texts = []
            for img in pages:
                # Transcribe each page using the configured OCR backend
                text, _ = pipeline.ocr._backend.transcribe(img)
                ocr_texts.append(text)
            extracted_text = "\n\n".join(ocr_texts)
        
        return {"extracted_text": extracted_text}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── POST /rubrics/generate ────────────────────
@router.post("/rubrics/generate", summary="[Instructor] Generate Rubric JSON from extracted text")
async def generate_rubric(
    payload: RubricGeneratePayload,
    pipeline: GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_instructor),
):
    from langchain_core.messages import SystemMessage, HumanMessage
    
    prompt = f"""You are an expert professor. Below is the text extracted from an Answer Key or Exam Document.
Extract the grading rubric.
Return a STRICT JSON array of Rubric objects matching this exact structure:
[
  {{
    "question_number": 1,
    "question": "The question text (if present)",
    "total_points": 10,
    "strict_mode": false,
    "criteria": [
      {{
        "criterion_id": "c1_q1",
        "description": "Description of what is required",
        "max_points": 5,
        "required_keywords": ["keyword1", "keyword2"],
        "partial_credit": true
      }}
    ]
  }}
]
Make sure to break down total points into logical criteria. Return ONLY valid JSON, no markdown fences.

ANSWER KEY TEXT:
{payload.extracted_text}"""
    
    try:
        response = pipeline.grader.llm.invoke([
            SystemMessage(content="You generate strict JSON rubrics."),
            HumanMessage(content=prompt)
        ])
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        
        # Validate that it is parseable JSON
        _json.loads(content)
        return {"rubrics_json": content}
    except Exception as e:
        logger.error("Failed to generate rubric: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate rubric: {str(e)}")

# ── POST /exams  ──────────────────────────────
@router.post("/exams", summary="[Instructor] Submit exam PDFs + rubric for grading")
async def submit_exam(
    course_id:     Annotated[str, Form()],
    rubrics_json:  Annotated[str, Form()],
    pdfs:          list[UploadFile] = File(...),
    pipeline:      GradeOpsPipeline = Depends(get_pipeline),
    current_user:  UserORM = Depends(require_instructor),
):
    exam_id = str(uuid.uuid4())
    instructor_id = current_user.user_id   # always use the authenticated user's ID
    tmp_dir = tempfile.mkdtemp(prefix="gradeops_")
    pdf_paths: list[str] = []
    try:
        for upload in pdfs:
            dest = os.path.join(
                tmp_dir, upload.filename or f"{uuid.uuid4()}.pdf")
            content = await upload.read()
            with open(dest, "wb") as fh:
                fh.write(content)
            pdf_paths.append(dest)

        rubrics = _parse_rubrics(rubrics_json, exam_id)

        batch = ExamBatch(
            exam_id=exam_id,
            course_id=course_id,
            instructor_id=instructor_id,
            pdf_paths=pdf_paths,
            rubrics=rubrics,
            student_count=len(pdf_paths),
        )

        def _run_and_cleanup(b: ExamBatch) -> object:
            try:
                return pipeline.run_exam(b)
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                logger.debug("Cleaned up temp dir: %s", tmp_dir)

        job_id = task_manager.submit(_run_and_cleanup, batch, exam_id=exam_id)
        logger.info("Exam submitted | exam_id=%s | job_id=%s | pdfs=%d",
                    exam_id, job_id, len(pdfs))

    except Exception:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise

    return {
        "exam_id": exam_id,
        "job_id":  job_id,
        "status":  JobStatus.QUEUED,
        "message": f"Processing {len(pdfs)} student PDF(s). Poll /jobs/{job_id} for status.",
    }


# ── GET /jobs/{job_id}  ───────────────────────
@router.get("/jobs/{job_id}", summary="Poll background job status")
async def get_job_status(
    job_id:       str,
    current_user: UserORM = Depends(require_ta_or_above),
):
    job = task_manager.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()


# ── GET /exams/{exam_id}/dashboard  ───────────
@router.get("/exams/{exam_id}/dashboard", summary="[TA+] TA review dashboard data")
async def get_dashboard(
    exam_id:      str,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_ta_or_above),
):
    try:
        return pipeline.get_dashboard_data(exam_id)
    except Exception as e:
        logger.exception("Failed to export grades CSV")
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
# Student Routes
# ─────────────────────────────────────────────

from auth import require_student

class RegradeRequestPayload(BaseModel):
    exam_id: str
    note: str

@router.get("/student/exams", summary="[Student] List my exams")
async def get_student_exams(
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_student),
):
    """Return a list of exams this student has grades for."""
    student_prefix = current_user.email.split("@")[0]
    batches = pipeline.storage.list_batches()
    
    my_exams = []
    for b in batches:
        exam_id = b["exam_id"]
        grades = pipeline.storage.load_grades(exam_id=exam_id, student_id=student_prefix)
        if grades:
            total_awarded = sum(g.total_awarded for g in grades)
            total_possible = sum(g.total_possible for g in grades)
            my_exams.append({
                "exam_id": exam_id,
                "course_id": b["course_id"],
                "total_awarded": total_awarded,
                "total_possible": total_possible,
            })
    return my_exams

@router.get("/student/exams/{exam_id}", summary="[Student] Get detailed grades for an exam")
async def get_student_exam_detail(
    exam_id: str,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_student),
):
    student_prefix = current_user.email.split("@")[0]
    grades = pipeline.storage.load_grades(exam_id=exam_id, student_id=student_prefix)
    if not grades:
        raise HTTPException(status_code=404, detail="No grades found for this exam")

    ocr = pipeline.storage.load_ocr(exam_id=exam_id, student_id=student_prefix)
    ocr_map = {o.question_number: o for o in ocr}

    items = []
    for g in grades:
        items.append({
            "grade": g.model_dump(),
            "crop_path": "/crops/" + os.path.basename(ocr_map[g.question_number].image_crop_path) if g.question_number in ocr_map and ocr_map[g.question_number].image_crop_path else None,
        })

    return items

@router.post("/student/grades/{grade_id}/regrade", summary="[Student] Submit regrade request")
async def submit_regrade(
    grade_id: str,
    payload: RegradeRequestPayload,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_student),
):
    student_prefix = current_user.email.split("@")[0]
    grades = pipeline.storage.load_grades(exam_id=payload.exam_id, student_id=student_prefix)
    
    # Ensure this grade actually belongs to the student
    target_grade = next((g for g in grades if g.grade_id == grade_id), None)
    if not target_grade:
        raise HTTPException(status_code=404, detail="Grade not found or doesn't belong to you")
        
    updated = pipeline.submit_regrade_request(grade_id, payload.note, payload.exam_id)
    return {"status": "ok", "updated_grade": updated.model_dump() if updated else None}


# ── GET /exams/{exam_id}/grades  ──────────────
@router.get("/exams/{exam_id}/grades", summary="[TA+] All grades for an exam")
async def get_grades(
    exam_id:         str,
    student_id:      str | None = None,
    question_number: int | None = None,
    pipeline:        GradeOpsPipeline = Depends(get_pipeline),
    current_user:    UserORM = Depends(require_ta_or_above),
):
    grades = pipeline.storage.load_grades(exam_id, student_id, question_number)
    return [g.model_dump() for g in grades]


# ── GET /exams/{exam_id}/grades/export  ───────
@router.get("/exams/{exam_id}/grades/export", summary="[Instructor] Export grades as CSV")
async def export_grades_csv(
    exam_id:      str,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_instructor),
):
    grades = pipeline.storage.load_grades(exam_id)
    if not grades:
        raise HTTPException(
            status_code=404, detail="No grades found for this exam")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "student_id", "question_number", "total_awarded", "total_possible",
        "status", "plagiarism_flag", "plagiarism_similarity",
        "ta_override_score", "reviewed_by", "overall_justification",
    ])
    writer.writeheader()
    for g in grades:
        writer.writerow({
            "student_id":            g.student_id,
            "question_number":       g.question_number,
            "total_awarded":         g.total_awarded,
            "total_possible":        g.total_possible,
            "status":                g.status.value,
            "plagiarism_flag":       g.plagiarism_flag,
            "plagiarism_similarity": g.plagiarism_similarity,
            "ta_override_score":     g.ta_override_score or "",
            "reviewed_by":           g.reviewed_by or "",
            "overall_justification": g.overall_justification,
        })

    output.seek(0)
    filename = f"grades_{exam_id[:8]}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── POST /grades/review  ──────────────────────
@router.post("/grades/review", summary="[TA+] Approve or override an AI grade")
async def ta_review(
    exam_id:      str,
    payload:      TAReviewPayload,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_ta_or_above),
):
    try:
        updated = pipeline.apply_ta_review(payload, exam_id=exam_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"status": "ok", "grade_id": payload.grade_id, "action": payload.action,
            "updated_grade": updated.model_dump() if updated else None}


# ── POST /grades/review/bulk  ─────────────────
@router.post("/grades/review/bulk", summary="[TA+] Bulk approve multiple grades")
async def ta_bulk_approve(
    exam_id:      str,
    payload:      BulkApprovePayload,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_ta_or_above),
):
    approved, skipped = [], []
    for gid in payload.grade_ids:
        try:
            pipeline.apply_ta_review(
                TAReviewPayload(
                    grade_id=gid, ta_id=payload.ta_id, action="approve"),
                exam_id=exam_id,
            )
            approved.append(gid)
        except Exception as exc:
            logger.warning("Bulk approve skipped grade %s: %s", gid, exc)
            skipped.append(gid)
    return {"approved": approved, "skipped": skipped}


# ── GET /exams/{exam_id}/plagiarism  ──────────
@router.get("/exams/{exam_id}/plagiarism", summary="[TA+] Plagiarism flags for an exam")
async def get_plagiarism_flags(
    exam_id:      str,
    min_score:    float = 0.0,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_ta_or_above),
):
    grades = pipeline.storage.load_grades(exam_id)
    flagged = [
        g.model_dump()
        for g in grades
        if g.plagiarism_flag and g.plagiarism_similarity >= min_score
    ]
    return {"exam_id": exam_id, "flagged_count": len(flagged), "results": flagged}


# ── GET /students/{student_id}/grades  ────────
@router.get("/students/{student_id}/grades", summary="[TA+] All grades for a student in an exam")
async def get_student_grades(
    student_id:   str,
    exam_id:      str,
    pipeline:     GradeOpsPipeline = Depends(get_pipeline),
    current_user: UserORM = Depends(require_ta_or_above),
):
    grades = pipeline.storage.load_grades(exam_id, student_id=student_id)
    return [g.model_dump() for g in grades]


# ── GET /health  ──────────────────────────────
@router.get("/health", summary="Health check (no auth required)")
async def health():
    return {
        "status":  "ok",
        "service": "GradeOps",
        "version": settings.app_version,
    }
