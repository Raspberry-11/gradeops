import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getReviewDashboard, reviewGrade, getRecentExams, deleteExam } from "../api";
import Card from "../components/Card";
import Button from "../components/Button";

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

export default function ReviewDashboard() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const initialExam = params.get("exam") || params.get("exam_id") || "";

  const [examId, setExamId] = useState(initialExam);
  const [grades, setGrades] = useState([]);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load recent exams on mount
    getRecentExams().then((data) => {
      if (data?.exams) {
        setRecentExams(data.exams);
      }
    }).catch(err => console.error("Could not fetch recent exams", err));
  }, []);

  useEffect(() => {
    if (initialExam) {
      load(initialExam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExam]);

  const load = async (overrideExamId) => {
    const id = overrideExamId ?? examId;
    if (!id) {
      setError("Please provide an exam ID.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getReviewDashboard(id);
      setGrades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Review load failed", err);
      setError("Could not load dashboard — using demo data.");
      setGrades([
        {
          grade_id: "g1",
          student_id: "s1",
          question_number: 1,
          ocr_text: "Einstein equation explanation...",
          total_awarded: 8,
          total_possible: 10,
          criterion_scores: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (gradeId) => {
    if (!examId) {
      alert("Exam ID required");
      return;
    }

    try {
      await reviewGrade(examId, gradeId, "ta_user1", "approve");
      setGrades((prev) => prev.map(g => g.grade_id === gradeId ? { ...g, status: "reviewed" } : g));
    } catch (err) {
      console.error("Approve failed", err);
      alert("Approve failed: " + (err?.message || "unknown error"));
    }
  };

  const overrideGrade = async (gradeId) => {
    if (!examId) {
      alert("Exam ID required");
      return;
    }

    const scoreRaw = prompt("Enter override score:");
    if (scoreRaw === null) return;
    const score = parseFloat(scoreRaw);
    if (Number.isNaN(score)) return alert("Invalid score");
    const note = prompt("Optional note:") || "";

    try {
      await reviewGrade(examId, gradeId, "ta_user1", "override", score, note);
      // Wait for it to process, but let's refresh the current view or mark approved locally
      setGrades((prev) => prev.map(g => g.grade_id === gradeId ? { ...g, total_awarded: score, status: "reviewed" } : g));
    } catch (err) {
      console.error("Override failed", err);
      alert("Override failed: " + (err?.message || "unknown error"));
    }
  };

  const handleDeleteExam = async () => {
    if (!examId) return;
    if (!window.confirm(`Are you sure you want to delete exam ${examId}?`)) return;
    
    try {
      await deleteExam(examId);
      setExamId("");
      setGrades([]);
      setRecentExams(recentExams.filter(id => id !== examId));
    } catch (err) {
      alert("Failed to delete exam.");
    }
  };

  // Group grades by student
  const students = [...new Set(grades.map(g => g.student_id))].sort();

  return (
    <div className="space-y-6">
      {recentExams.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-3">Available Exams</h2>
          <div className="flex flex-wrap gap-2">
            {recentExams.map((id) => (
              <button
                key={id}
                onClick={() => {
                  setExamId(id);
                  load(id);
                }}
                className={`px-3 py-1 text-sm rounded-full border shadow-sm ${
                  examId === id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                }`}
              >
                {formatExamName(id)}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex gap-3">
          <input
            className="border rounded-xl p-3 flex-1"
            placeholder="Exam ID"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
          />

          <Button onClick={() => load()} disabled={loading || !examId}>
            {loading ? "Loading..." : "Load Dashboard"}
          </Button>

          <Button onClick={handleDeleteExam} disabled={!examId} className="bg-red-500 hover:bg-red-600">
            Delete Exam
          </Button>
        </div>

        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </Card>

      <div className="space-y-8">
        {grades.length === 0 && !loading && (
          <Card>
            <div className="text-gray-600">No pending grades.</div>
          </Card>
        )}

        {students.map(studentId => {
          const studentGrades = grades.filter(g => g.student_id === studentId).sort((a,b) => a.question_number - b.question_number);
          const pointsAwarded = studentGrades.reduce((sum, g) => sum + g.total_awarded, 0);
          const pointsPossible = studentGrades.reduce((sum, g) => sum + g.total_possible, 0);

          return (
            <Card key={studentId}>
              <div className="border-b pb-4 mb-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold">Student: {studentId}</h3>
                <span className="font-bold text-lg text-indigo-700">Total: {pointsAwarded}/{pointsPossible}</span>
              </div>
              
              <div className="grid gap-6">
                {studentGrades.map((g) => (
                  <div key={g.grade_id} className={`p-4 border rounded-xl ${g.status === "reviewed" ? "bg-green-50 border-green-200" : "bg-white"}`}>
                    <div className="flex justify-between mb-2">
                      <div className="font-semibold">Question {g.question_number}</div>
                      <div className="font-bold text-indigo-600">{g.total_awarded}/{g.total_possible}</div>
                    </div>

                    <div className="bg-gray-50 border p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-mono mb-4">
                      {g.ocr_text || "(No OCR text available)"}
                    </div>
                    
                    <div className="text-sm text-gray-600 italic mb-4">
                      {g.overall_justification || "No justification provided."}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {g.status !== "reviewed" && (
                        <>
                          <Button onClick={() => approve(g.grade_id)}>Approve</Button>
                          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => overrideGrade(g.grade_id)}>
                            Override
                          </Button>
                        </>
                      )}
                      {g.status === "reviewed" && <span className="text-sm font-semibold text-green-700">Reviewed ✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
