/**
 * src/pages/UploadExam.jsx
 * Upload exam PDFs with a dynamic rubric builder.
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, Plus, Trash2, FileText, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { Card, Button, Spinner } from "../components/shared";
import { uploadExam } from "../api";
import { useToast } from "../context/ToastContext";

// ── Criterion Row ─────────────────────────────────────────────────────────────

function CriterionRow({ criterion, onChange, onRemove }) {
  const [kwInput, setKwInput] = useState("");

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw) return;
    onChange({ ...criterion, required_keywords: [...criterion.required_keywords, kw] });
    setKwInput("");
  };

  const removeKeyword = (idx) => {
    onChange({
      ...criterion,
      required_keywords: criterion.required_keywords.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="label">Criterion ID</label>
            <input
              className="input"
              placeholder="e.g. c1"
              value={criterion.criterion_id}
              onChange={(e) => onChange({ ...criterion, criterion_id: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input
              className="input"
              placeholder="e.g. Correct formula"
              value={criterion.description}
              onChange={(e) => onChange({ ...criterion, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Max Points</label>
            <input
              className="input"
              type="number"
              min={0}
              value={criterion.max_points}
              onChange={(e) => onChange({ ...criterion, max_points: Number(e.target.value) })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Required Keywords</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add keyword, press Enter"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
              />
              <Button variant="secondary" type="button" onClick={addKeyword} className="shrink-0 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {criterion.required_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {criterion.required_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium"
                  >
                    {kw}
                    <button type="button" onClick={() => removeKeyword(i)} aria-label={`Remove ${kw}`}>
                      <Trash2 className="w-3 h-3 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id={`pc-${criterion.criterion_id}`}
              checked={criterion.partial_credit}
              onChange={(e) => onChange({ ...criterion, partial_credit: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600"
            />
            <label htmlFor={`pc-${criterion.criterion_id}`} className="text-sm text-slate-600">
              Partial credit
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-5 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          aria-label="Remove criterion"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Question Block ────────────────────────────────────────────────────────────

function QuestionBlock({ question, onChange, onRemove, index }) {
  const [collapsed, setCollapsed] = useState(false);

  const addCriterion = () => {
    const newC = {
      criterion_id: `c${question.criteria.length + 1}`,
      description: "",
      max_points: 5,
      required_keywords: [],
      partial_credit: true,
    };
    onChange({ ...question, criteria: [...question.criteria, newC] });
  };

  const updateCriterion = (idx, updated) => {
    const criteria = question.criteria.map((c, i) => (i === idx ? updated : c));
    onChange({ ...question, criteria });
  };

  const removeCriterion = (idx) => {
    onChange({ ...question, criteria: question.criteria.filter((_, i) => i !== idx) });
  };

  const totalPoints = question.criteria.reduce((s, c) => s + (Number(c.max_points) || 0), 0);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            Q{question.question_number}
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold text-slate-800">Question {question.question_number}</span>
            <span className="ml-2 text-xs text-slate-400">
              {question.criteria.length} criteria · {totalPoints} pts
            </span>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="ml-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label={`Remove question ${question.question_number}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Total points + strict mode */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="label">Total Points</label>
              <input
                className="input"
                type="number"
                min={0}
                value={question.total_points}
                onChange={(e) => onChange({ ...question, total_points: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id={`strict-${question.question_number}`}
                checked={question.strict_mode}
                onChange={(e) => onChange({ ...question, strict_mode: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              <label htmlFor={`strict-${question.question_number}`} className="text-sm text-slate-600">
                Strict mode
              </label>
            </div>
          </div>

          {/* Criteria */}
          <div className="space-y-2">
            {question.criteria.map((c, i) => (
              <CriterionRow
                key={i}
                criterion={c}
                onChange={(updated) => updateCriterion(i, updated)}
                onRemove={() => removeCriterion(i)}
              />
            ))}
          </div>
          <Button type="button" variant="secondary" onClick={addCriterion} className="w-full">
            <Plus className="w-4 h-4" /> Add Criterion
          </Button>
        </div>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const newQuestion = (n) => ({
  question_number: n,
  total_points: 10,
  strict_mode: false,
  criteria: [
    { criterion_id: "c1", description: "", max_points: 5, required_keywords: [], partial_credit: true },
  ],
});

export default function UploadExam() {
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [courseId, setCourseId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [questions, setQuestions] = useState([newQuestion(1)]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!courseId.trim()) e.courseId = "Course ID is required.";
    if (!instructorId.trim()) e.instructorId = "Instructor ID is required.";
    if (files.length === 0) e.files = "At least one PDF is required.";
    if (questions.length === 0) e.questions = "At least one question is required.";
    questions.forEach((q, qi) => {
      if (q.criteria.length === 0) e[`q${qi}`] = `Question ${q.question_number} needs at least one criterion.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("course_id", courseId.trim());
      fd.append("instructor_id", instructorId.trim());
      fd.append("rubrics_json", JSON.stringify(questions));
      files.forEach((f) => fd.append("pdfs", f));

      const data = await uploadExam(fd);
      setResult(data);
      toast("Exam uploaded successfully!", "success");
    } catch (err) {
      toast(err.userMessage ?? "Upload failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions((qs) => [...qs, newQuestion(qs.length + 1)]);
  };

  const updateQuestion = (idx, updated) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? updated : q)));
  };

  const removeQuestion = (idx) => {
    setQuestions((qs) =>
      qs
        .filter((_, i) => i !== idx)
        .map((q, i) => ({ ...q, question_number: i + 1 }))
    );
  };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter((f) => f.type === "application/pdf");
    setFiles(selected);
    if (selected.length === 0 && e.target.files.length > 0) {
      toast("Only PDF files are accepted.", "error");
    }
  };

  if (result) {
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <Card className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Exam Submitted</h2>
          <p className="text-slate-500 text-sm mb-6">Your exam is being processed. Track progress below.</p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2 mb-6">
            {result.exam_id && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Exam ID</span>
                <code className="font-mono text-slate-800">{result.exam_id}</code>
              </div>
            )}
            {result.job_id && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Job ID</span>
                <code className="font-mono text-slate-800">{result.job_id}</code>
              </div>
            )}
            {result.status && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="text-slate-800 capitalize">{result.status}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            {result.job_id && (
              <Button onClick={() => navigate(`/jobs/${result.job_id}`)}>
                Track Job Status
              </Button>
            )}
            {result.exam_id && (
              <Button variant="secondary" onClick={() => navigate(`/review?exam_id=${result.exam_id}`)}>
                Review Grades
              </Button>
            )}
            <Button variant="ghost" onClick={() => setResult(null)}>
              Upload Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Upload Exam</h1>
        <p className="text-slate-500 text-sm">Configure rubrics and upload student answer PDFs for AI grading.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Exam info */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Exam Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Course ID *</label>
              <input
                className={`input ${errors.courseId ? "border-red-400" : ""}`}
                placeholder="e.g. CS101"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setErrors((ev) => ({ ...ev, courseId: null })); }}
              />
              {errors.courseId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.courseId}</p>}
            </div>
            <div>
              <label className="label">Instructor ID *</label>
              <input
                className={`input ${errors.instructorId ? "border-red-400" : ""}`}
                placeholder="e.g. PROF_001"
                value={instructorId}
                onChange={(e) => { setInstructorId(e.target.value); setErrors((ev) => ({ ...ev, instructorId: null })); }}
              />
              {errors.instructorId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.instructorId}</p>}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="label">Answer PDFs *</label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all duration-150 ${errors.files ? "border-red-400 bg-red-50/30" : "border-slate-200"}`}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              tabIndex={0}
              role="button"
              aria-label="Select PDF files"
            >
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {files.length > 0 ? (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <p key={i} className="text-xs text-slate-700 font-medium">{f.name}</p>
                  ))}
                  <p className="text-xs text-slate-400 mt-1">{files.length} file(s) selected</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500 font-medium">Click to select PDFs</p>
                  <p className="text-xs text-slate-400 mt-0.5">Multiple files accepted</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
            </div>
            {errors.files && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.files}</p>}
          </div>
        </Card>

        {/* Rubric builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Rubric Builder
            </h2>
            <span className="text-xs text-slate-400">{questions.length} question(s)</span>
          </div>
          {errors.questions && (
            <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.questions}</p>
          )}
          {questions.map((q, i) => (
            <div key={i}>
              <QuestionBlock
                question={q}
                index={i}
                onChange={(updated) => updateQuestion(i, updated)}
                onRemove={() => removeQuestion(i)}
              />
              {errors[`q${i}`] && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 px-1"><AlertCircle className="w-3 h-3" />{errors[`q${i}`]}</p>
              )}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addQuestion} className="w-full">
            <Plus className="w-4 h-4" /> Add Question
          </Button>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? <><Spinner size="sm" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload Exam</>}
          </Button>
        </div>
      </form>
    </div>
  );
}