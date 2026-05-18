/**
 * src/pages/Grades.jsx
 * Browse grades table with sorting, row expand, CSV export, plagiarism modal.
 */

import { useState, useCallback, useEffect } from "react";
import {
  BarChart2, ChevronDown, ChevronUp, Download, AlertCircle,
  Search, Filter, ArrowUpDown,
} from "lucide-react";
import { Card, Button, Spinner, Tag, ScoreBar, EmptyState } from "../components/shared";
import Modal from "../components/Modal";
import { getGrades, downloadGradesCSV, getPlagiarism, getRecentExams } from "../api";
import { useToast } from "../context/ToastContext";
import { DEMO_GRADES, DEMO_PLAGIARISM } from "../demoData";

// ── Expanded row ──────────────────────────────────────────────────────────────

function ExpandedRow({ grade }) {
  return (
    <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-3 animate-slide-up bg-slate-50/50">
      {grade.ocr_text && (
        <div>
          <p className="label">OCR Text</p>
          <p className="text-xs font-mono text-slate-600 bg-white rounded-lg p-3 border border-slate-200 leading-relaxed">
            {grade.ocr_text}
          </p>
        </div>
      )}
      {grade.criterion_scores?.length > 0 && (
        <div>
          <p className="label">Criterion Breakdown</p>
          <div className="space-y-1.5">
            {grade.criterion_scores.map((s) => (
              <div key={s.criterion_id} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-indigo-600 w-10 shrink-0">{s.criterion_id}</span>
                <span className="flex-1 text-slate-600">{s.justification}</span>
                <span className="font-semibold font-mono text-slate-800 shrink-0">{s.awarded_points}pt</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {grade.overall_justification && (
        <div>
          <p className="label">Overall Justification</p>
          <p className="text-xs text-slate-500 italic">{grade.overall_justification}</p>
        </div>
      )}
      {grade.ta_override_score != null && (
        <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-xs text-purple-700">
          <strong>Override score:</strong> {grade.ta_override_score} — {grade.ta_override_note}
        </div>
      )}
      {grade.reviewed_by && (
        <p className="text-xs text-slate-400">Reviewed by: {grade.reviewed_by}</p>
      )}
      {grade.graded_at && (
        <p className="text-xs text-slate-400">Graded: {new Date(grade.graded_at).toLocaleString()}</p>
      )}
    </div>
  );
}

// ── Grade table row ───────────────────────────────────────────────────────────

function GradeRow({ grade }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center min-w-0">
          <span className="text-sm font-semibold text-slate-800 truncate">{grade.student_id}</span>
          <span className="text-sm text-slate-500">Q{grade.question_number}</span>
          <div className="hidden sm:block">
            <ScoreBar awarded={grade.total_awarded} possible={grade.total_possible} />
          </div>
          <div className="hidden sm:flex">
            <Tag status={grade.status} />
          </div>
          {grade.plagiarism_flag && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              {Math.round(grade.plagiarism_similarity * 100)}%
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-expanded={expanded}
          aria-label="Expand row"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && <ExpandedRow grade={grade} />}
    </Card>
  );
}

// ── Plagiarism Modal ──────────────────────────────────────────────────────────

function PlagiarismModal({ open, onClose, results, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Plagiarism Report" size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : results.length === 0 ? (
        <EmptyState icon={AlertCircle} title="No flagged submissions" description="No submissions exceeded the plagiarism threshold." />
      ) : (
        <div className="space-y-3">
          {results.map((g) => (
            <div key={g.grade_id} className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{g.student_id}</span>
                  <span className="text-xs text-slate-500">Q{g.question_number}</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  {Math.round(g.plagiarism_similarity * 100)}% similar
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600 line-clamp-2">{g.ocr_text}</p>
              <ScoreBar awarded={g.total_awarded} possible={g.total_possible} className="mt-2" />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Sorting helper ────────────────────────────────────────────────────────────

const SORT_FIELDS = ["student_id", "question_number", "total_awarded", "status"];

function sortGrades(grades, field, dir) {
  return [...grades].sort((a, b) => {
    const va = a[field] ?? "";
    const vb = b[field] ?? "";
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function formatExamName(examId) {
  const parts = examId.split('_');
  if (parts.length >= 3) {
    const course = parts[0];
    const dateStr = parts[1];
    const timeStr = parts[2];
    if (dateStr.length === 8 && timeStr.length === 4) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hh = timeStr.substring(0, 2);
      const mm = timeStr.substring(2, 4);
      return `${course} ( ${month}/${day}/${year} at ${hh}:${mm} )`;
    }
  }
  return examId;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Grades() {
  const toast = useToast();

  const [examId, setExamId] = useState("");
  const [inputId, setInputId] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [qFilter, setQFilter] = useState("");

  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [sortField, setSortField] = useState("student_id");
  const [sortDir, setSortDir] = useState("asc");

  const [plagiarismOpen, setPlagiarismOpen] = useState(false);
  const [plagiarismResults, setPlagiarismResults] = useState([]);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [recentExams, setRecentExams] = useState([]);

  useEffect(() => {
    getRecentExams().then((data) => {
      if (data?.exams) {
        setRecentExams(data.exams);
      }
    }).catch(err => console.error("Could not fetch recent exams", err));
  }, []);

  const fetchGrades = useCallback(async (id, studentId, qNum) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getGrades(id, {
        student_id: studentId || undefined,
        question_number: qNum ? Number(qNum) : undefined,
      });
      setGrades(Array.isArray(data) ? data : []);
    } catch (err) {
      toast(err.userMessage ?? "Failed to fetch. Showing demo data.", "error");
      setGrades(DEMO_GRADES);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSearch = (e) => {
    e.preventDefault();
    const id = inputId.trim();
    if (!id) return;
    setExamId(id);
    fetchGrades(id, studentFilter, qFilter);
  };

  const handleExport = async () => {
    if (!examId) { toast("Enter an Exam ID first.", "info"); return; }
    setExportLoading(true);
    try {
      await downloadGradesCSV(examId);
      toast("CSV downloaded.", "success");
    } catch (err) {
      toast(err.userMessage ?? "Export failed.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewPlagiarism = async () => {
    if (!examId) { toast("Enter an Exam ID first.", "info"); return; }
    setPlagiarismOpen(true);
    setPlagiarismLoading(true);
    try {
      const data = await getPlagiarism(examId);
      setPlagiarismResults(Array.isArray(data) ? data : []);
    } catch {
      setPlagiarismResults(DEMO_PLAGIARISM);
    } finally {
      setPlagiarismLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = sortGrades(grades, sortField, sortDir);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Grades</h1>
        <p className="text-slate-500 text-sm">Browse, filter, and export graded submissions.</p>
      </div>

      {recentExams.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Available Exams</h2>
          <div className="flex flex-wrap gap-2">
            {recentExams.map((id) => (
              <button
                key={id}
                onClick={() => {
                  setExamId(id);
                  setInputId(id);
                  fetchGrades(id, studentFilter, qFilter);
                }}
                className={`px-3 py-1 text-sm rounded-full border shadow-sm ${
                  examId === id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                }`}
              >
                {formatExamName(id)}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Filter card */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Exam ID *</label>
              <input className="input" placeholder="e.g. EXAM_001" value={inputId} onChange={(e) => setInputId(e.target.value)} />
            </div>
            <div>
              <label className="label">Student ID (optional)</label>
              <input className="input" placeholder="e.g. STU_1042" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} />
            </div>
            <div>
              <label className="label">Question # (optional)</label>
              <input className="input" type="number" min={1} placeholder="e.g. 1" value={qFilter} onChange={(e) => setQFilter(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
              {loading ? "Loading…" : "Fetch Grades"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
              Export CSV
            </Button>
            <Button type="button" variant="secondary" onClick={handleViewPlagiarism}>
              <AlertCircle className="w-4 h-4 text-red-500" />
              Plagiarism Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Sort controls */}
      {grades.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-1">Sort by:</span>
          {SORT_FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleSort(f)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                sortField === f
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.replace("_", " ")}
              {sortField === f ? (
                sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-40" />
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">{grades.length} result(s)</span>
        </div>
      )}

      {/* Grades list */}
      <div className="space-y-2">
        {loading && (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        )}
        {!loading && grades.length === 0 && examId && (
          <EmptyState icon={BarChart2} title="No grades found" description="Try adjusting your filters or check the Exam ID." />
        )}
        {!loading && !examId && (
          <EmptyState icon={Filter} title="Enter an Exam ID above" description="Grades will appear here after fetching." />
        )}
        {!loading && sorted.map((g) => (
          <GradeRow key={g.grade_id} grade={g} />
        ))}
      </div>

      {/* Plagiarism modal */}
      <PlagiarismModal
        open={plagiarismOpen}
        onClose={() => setPlagiarismOpen(false)}
        results={plagiarismResults}
        loading={plagiarismLoading}
      />
    </div>
  );
}