"""
ocr_pipeline.py — GradeOps OCR Module
Extracts and transcribes handwritten answers from scanned exam PDFs.

Supported backends:
  - "qwen_vl"  : Qwen2-VL via HuggingFace (recommended for handwriting)
  - "nougat"   : Meta Nougat (better for printed/mixed content)
  - "mock"     : Returns dummy text (for testing without GPU)

Usage:
    pipeline = OCRPipeline(backend="qwen_vl")
    results  = pipeline.process_exam_pdf("exam_001", "student_42", "scan.pdf", num_questions=5)
"""

import os
import uuid
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Literal

import fitz                        # PyMuPDF — pip install pymupdf
from PIL import Image
# FIX #13: removed unused "import numpy as np"

from models import OCRResult

logger = logging.getLogger(__name__)

BackendType = Literal["qwen_vl", "nougat", "mock"]


# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

@dataclass
class OCRConfig:
    backend: BackendType = "qwen_vl"
    device: str = "cuda"               # "cuda" | "cpu"
    crop_output_dir: str = "./crops"
    dpi: int = 200                     # PDF → image resolution
    confidence_threshold: float = 0.5  # below this → flag for manual review
    qwen_model_id: str = "Qwen/Qwen2-VL-7B-Instruct"
    nougat_model_id: str = "facebook/nougat-base"


# ─────────────────────────────────────────────
# Backend loaders (lazy — only loaded when needed)
# ─────────────────────────────────────────────

class _QwenVLBackend:
    """Wraps Qwen2-VL for handwriting transcription."""

    def __init__(self, model_id: str, device: str):
        from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
        import torch

        logger.info("Loading Qwen2-VL model: %s", model_id)
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            model_id,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map=device,
        )
        self.device = device

    def transcribe(self, image: Image.Image) -> tuple[str, float]:
        """Returns (transcribed_text, confidence_score)."""
        import torch

        prompt = (
            "This is a scanned handwritten student exam answer. "
            "Transcribe every word exactly as written, including any crossed-out text. "
            "Do not add explanations. Output only the transcribed text."
        )
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text",  "text": prompt},
                ],
            }
        ]
        text_input = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.processor(
            text=[text_input], images=[image], return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=512,
                do_sample=False,
            )
        generated = output_ids[:, inputs["input_ids"].shape[1]:]
        text = self.processor.batch_decode(generated, skip_special_tokens=True)[0]

        # Heuristic confidence: longer non-empty responses = higher confidence
        confidence = min(0.95, 0.5 + len(text.split()) * 0.01)
        return text.strip(), round(confidence, 3)


class _NougatBackend:
    """Wraps Meta Nougat for document transcription."""

    def __init__(self, model_id: str, device: str):
        # FIX #4: use the correct nougat API (from_pretrained via transformers,
        # not the internal nougat.NougatModel path which has no from_pil helper)
        from transformers import NougatProcessor, VisionEncoderDecoderModel
        import torch

        logger.info("Loading Nougat model: %s", model_id)
        self.processor = NougatProcessor.from_pretrained(model_id)
        self.model = VisionEncoderDecoderModel.from_pretrained(model_id).to(device)
        self.model.eval()
        self.device = device

    def transcribe(self, image: Image.Image) -> tuple[str, float]:
        # FIX #4: use processor + generate instead of non-existent ImageDataset.from_pil
        import torch

        pixel_values = self.processor(image, return_tensors="pt").pixel_values.to(self.device)
        with torch.no_grad():
            outputs = self.model.generate(
                pixel_values,
                min_length=1,
                max_new_tokens=512,
                bad_words_ids=[[self.processor.tokenizer.unk_token_id]],
            )
        text = self.processor.batch_decode(outputs, skip_special_tokens=True)[0]
        confidence = 0.80  # Nougat doesn't expose per-sample confidence
        return text.strip(), confidence


class _MockBackend:
    """Deterministic mock — safe to use without GPU."""

    def __init__(self):
        self.dummy_texts = [
            "The time complexity of the algorithm is O(n log n) because the merge sort recursively divides the array and merges in linear time.",
            "Newton's first law states that an object at rest stays at rest unless acted upon by an external force.",
            "E = mc² is Einstein's mass-energy equivalence formula. The energy of a body is equal to its mass multiplied by the speed of light squared.",
            "Photosynthesis is the process by which green plants map sunlight into chemical energy.",
            "According to the Constitution, the legislative branch is responsible for making laws."
        ]

    def transcribe(self, image: Image.Image) -> tuple[str, float]:
        import random
        # Try to run simple pytesseract if installing locally (for windows users often installed).
        # Otherwise fallback to pure PyMuPDF text extraction fallback and finally the dummy string.
        try:
            import pytesseract
            text = pytesseract.image_to_string(image).strip()
            if text:
                return text, 0.90
        except Exception:
            pass

        # If we really just want to give them back the text to "correct it", let's use the actual 
        # file text directly if possible, or just mock it carefully!
        text = random.choice(self.dummy_texts)
        confidence = round(random.uniform(0.65, 0.98), 2)
        return text, confidence


class _PyMuPDFBackend:
    """A lightweight backend that reads native text from the PDF if it's digital (not scanned).
       It avoids needing a huge downloaded model if the PDF already contains text."""

    def __init__(self, original_pdf_path):
        import fitz
        self.doc = fitz.open(original_pdf_path)

    def transcribe(self, image: Image.Image, page_idx: int) -> tuple[str, float]:
        if page_idx < len(self.doc):
            page = self.doc[page_idx]
            text = page.get_text("text").strip()
            if text:
                return text, 0.95
        
        # If it's pure image and no text, fallback to Dummy text for local dev
        import random
        return "The time complexity is O(n) because we iterate the array once.", 0.65

# ─────────────────────────────────────────────
# Main Pipeline
# ─────────────────────────────────────────────

class OCRPipeline:
    """
    Full OCR pipeline: PDF → page images → per-question crops → transcription.

    Args:
        config: OCRConfig instance (or uses defaults).
    """

    def __init__(self, config: OCRConfig | None = None):
        self.cfg = config or OCRConfig()
        Path(self.cfg.crop_output_dir).mkdir(parents=True, exist_ok=True)
        self._backend = self._load_backend()

    # ── public ────────────────────────────────

    def process_exam_pdf(
        self,
        exam_id: str,
        student_id: str,
        pdf_path: str,
        num_questions: int,
        question_regions: list[dict] | None = None,
    ) -> list[OCRResult]:
        """
        Process one student's PDF exam.

        Args:
            exam_id:          Unique exam identifier.
            student_id:       Student identifier.
            pdf_path:         Local path to the scanned PDF.
            num_questions:    Number of questions to extract.
            question_regions: Optional list of dicts with keys
                              {page, x0, y0, x1, y1} per question.
                              If None, splits each page evenly.

        Returns:
            List of OCRResult, one per question.
        """
        # FIX #7: guard against question_regions shorter than num_questions
        if question_regions and len(question_regions) < num_questions:
            logger.warning(
                "question_regions has %d entries but num_questions=%d; "
                "falling back to auto-split for missing regions.",
                len(question_regions), num_questions,
            )

        pages = self._pdf_to_images(pdf_path)
        results: list[OCRResult] = []

        for q_num in range(1, num_questions + 1):
            region = (
                question_regions[q_num - 1]
                if question_regions and q_num - 1 < len(question_regions)
                else None
            )
            crop, page_num = self._extract_question_crop(pages, q_num, num_questions, region)

            crop_path = self._save_crop(crop, exam_id, student_id, q_num)
            
            # Use PyTesseract if available inside Mock Backend
            text, confidence = self._backend.transcribe(crop)

            # Fallback: if using mock backend and it gave dummy text, try native PDF text exactration
            if self.cfg.backend == "mock" and hasattr(self._backend, "dummy_texts") and text in self._backend.dummy_texts:
                native_text = self._get_page_text(pdf_path, page_num - 1)
                if native_text:
                    text = native_text
                    confidence = 0.99

            if confidence < self.cfg.confidence_threshold:
                logger.warning(
                    "Low OCR confidence %.2f for student=%s q=%d — may need manual check",
                    confidence, student_id, q_num,
                )

            results.append(
                OCRResult(
                    student_id=student_id,
                    exam_id=exam_id,
                    question_number=q_num,
                    raw_text=text,
                    confidence=confidence,
                    image_crop_path=crop_path,
                    page_number=page_num,
                )
            )
            logger.debug("OCR q%d | student=%s | conf=%.2f | chars=%d",
                         q_num, student_id, confidence, len(text))

        return results

    def process_exam_batch(
        self,
        exam_id: str,
        pdf_paths: dict[str, str],   # {student_id: pdf_path}
        num_questions: int,
        question_regions: list[dict] | None = None,
    ) -> dict[str, list[OCRResult]]:
        """Process PDFs for all students in a batch."""
        all_results: dict[str, list[OCRResult]] = {}
        for student_id, pdf_path in pdf_paths.items():
            logger.info("Processing OCR for student %s …", student_id)
            all_results[student_id] = self.process_exam_pdf(
                exam_id, student_id, pdf_path, num_questions, question_regions
            )
        return all_results

    # ── private ───────────────────────────────

    def _load_backend(self):
        b = self.cfg.backend
        if b == "qwen_vl":
            return _QwenVLBackend(self.cfg.qwen_model_id, self.cfg.device)
        elif b == "nougat":
            return _NougatBackend(self.cfg.nougat_model_id, self.cfg.device)
        elif b == "mock":
            return _MockBackend()
        raise ValueError(f"Unknown OCR backend: {b}")

    def _pdf_to_images(self, pdf_path: str) -> list[Image.Image]:
        """Convert each PDF page to a PIL Image."""
        doc = fitz.open(pdf_path)
        images = []
        mat = fitz.Matrix(self.cfg.dpi / 72, self.cfg.dpi / 72)
        for page in doc:
            pix = page.get_pixmap(matrix=mat)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        doc.close()
        return images

    def _extract_question_crop(
        self,
        pages: list[Image.Image],
        q_num: int,
        total_questions: int,
        region: dict | None,
    ) -> tuple[Image.Image, int]:
        """
        Crop the image region for question q_num.
        If no region provided, divides pages evenly across questions.

        FIX #7: when num_questions > num_pages, each page is divided into equal
        vertical strips proportional to the questions assigned to that page,
        instead of always dividing by total_questions (which gave too-small strips
        when several questions share one page).
        """
        if region:
            page_idx = region["page"] - 1
            img = pages[min(page_idx, len(pages) - 1)]
            crop = img.crop((region["x0"], region["y0"], region["x1"], region["y1"]))
            return crop, page_idx + 1

        num_pages = len(pages)

        if num_pages >= total_questions:
            # One question per page (or questions fewer than pages): simple mapping
            page_idx = min(q_num - 1, num_pages - 1)
            return pages[page_idx], page_idx + 1

        # More questions than pages: distribute questions evenly across pages
        questions_per_page = total_questions / num_pages
        page_idx = min(int((q_num - 1) / questions_per_page), num_pages - 1)
        img = pages[page_idx]
        w, h = img.size

        # Which question slot within this page?
        first_q_on_page = int(page_idx * questions_per_page)
        q_on_page = q_num - 1 - first_q_on_page
        qs_on_this_page = round(questions_per_page) or 1
        strip_h = h // qs_on_this_page
        y0 = q_on_page * strip_h
        y1 = min(y0 + strip_h, h)

        if y0 >= h:
            logger.warning(
                "Crop y0=%d >= page height=%d for q%d — clamping to last strip.",
                y0, h, q_num,
            )
            y0 = max(0, h - strip_h)
            y1 = h

        return img.crop((0, y0, w, y1)), page_idx + 1

    def _save_crop(self, crop: Image.Image, exam_id: str, student_id: str, q_num: int) -> str:
        fname = f"{exam_id}_{student_id}_q{q_num}_{uuid.uuid4().hex[:6]}.png"
        path = os.path.join(self.cfg.crop_output_dir, fname)
        crop.save(path)
        return path

    def _get_page_text(self, pdf_path: str, page_idx: int) -> str:
        """Fallback to extract text directly from the digital PDF."""
        import fitz
        try:
            doc = fitz.open(pdf_path)
            if page_idx < len(doc):
                text = doc[page_idx].get_text("text").strip()
                doc.close()
                return text
            doc.close()
        except Exception:
            pass
        return ""
