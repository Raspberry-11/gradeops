import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ChevronLeft, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StudentExamView() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Regrade modal state
  const [regradeTarget, setRegradeTarget] = useState(null);
  const [regradeNote, setRegradeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line
  }, [examId]);

  async function fetchDetail() {
    try {
      const data = await api.getStudentExamDetail(examId);
      // Sort by question number
      data.sort((a, b) => a.grade.question_number - b.grade.question_number);
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRegrade(e) {
    e.preventDefault();
    if (!regradeTarget || !regradeNote.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.submitRegrade(regradeTarget.grade_id, {
        exam_id: examId,
        note: regradeNote
      });
      // Update local state
      setItems(prev => prev.map(item => {
        if (item.grade.grade_id === regradeTarget.grade_id) {
          return { ...item, grade: res.updated_grade };
        }
        return item;
      }));
      setRegradeTarget(null);
      setRegradeNote('');
    } catch (err) {
      alert("Failed to submit regrade request: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-500 font-medium animate-pulse">Loading exam details...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Error: {error}</div>;
  }

  const totalAwarded = items.reduce((acc, it) => acc + it.grade.total_awarded, 0);
  const totalPossible = items.reduce((acc, it) => acc + it.grade.total_possible, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/student/dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exam Results</h1>
          <p className="text-sm text-slate-500 mt-1">ID: {examId}</p>
        </div>
        <div className="ml-auto bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-center">
          <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-0.5">Total Score</div>
          <div className="text-xl font-bold text-indigo-900">{totalAwarded} / {totalPossible}</div>
        </div>
      </div>

      <div className="space-y-6">
        {items.map(({ grade, crop_path }) => {
          const isRegradePending = grade.status === 'pending_regrade';
          const isOverridden = grade.status === 'overridden';
          const isApproved = grade.status === 'approved';

          return (
            <div key={grade.grade_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  Question {grade.question_number}
                  {isRegradePending && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3 h-3" /> Regrade Pending
                    </span>
                  )}
                  {isOverridden && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                      <CheckCircle2 className="w-3 h-3" /> Grade Overridden
                    </span>
                  )}
                </h3>
                <div className="font-bold text-lg text-slate-900">
                  {grade.total_awarded} <span className="text-sm font-normal text-slate-500">/ {grade.total_possible} pts</span>
                </div>
              </div>

              <div className="p-5 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  {/* OCR / Image */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Answer</h4>
                    {crop_path ? (
                      <img 
                        src={`/api/v1${crop_path}`} 
                        alt={`Q${grade.question_number} crop`} 
                        className="w-full max-h-48 object-contain rounded border border-slate-200 bg-slate-50"
                      />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm text-slate-700 font-mono">
                        {grade.ocr_text || "No text extracted."}
                      </div>
                    )}
                  </div>

                  {/* Feedback */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">AI Feedback</h4>
                    <p className="text-sm text-slate-700 mb-3">{grade.overall_justification}</p>
                    
                    <div className="space-y-2">
                      {grade.criterion_scores.map(cs => (
                        <div key={cs.criterion_id} className="flex gap-3 text-sm border-l-2 border-slate-200 pl-3">
                          <span className={`font-semibold shrink-0 ${cs.awarded_points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            [{cs.awarded_points}pt]
                          </span>
                          <span className="text-slate-600">{cs.justification}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TA Override Note */}
                  {grade.ta_override_note && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm">
                      <h4 className="font-semibold text-indigo-900 mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" /> TA Comment
                      </h4>
                      <p className="text-indigo-800">{grade.ta_override_note}</p>
                    </div>
                  )}
                </div>

                <div className="md:w-64 shrink-0 flex flex-col">
                  {/* Regrade Button area */}
                  <div className="mt-auto pt-4 border-t border-slate-100 md:border-t-0 md:pt-0">
                    {!isRegradePending && (
                      <button 
                        onClick={() => setRegradeTarget(grade)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        Request Regrade
                      </button>
                    )}
                    {isRegradePending && (
                      <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <p className="text-xs font-medium text-amber-800 mb-1">Your request is under review</p>
                        <p className="text-xs text-amber-600 italic line-clamp-2">"{grade.regrade_request_note}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regrade Modal */}
      {regradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRegradeTarget(null)} />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Request Regrade for Q{regradeTarget.question_number}</h3>
            </div>
            
            <form onSubmit={handleSubmitRegrade} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Why do you believe this grade is incorrect?
                </label>
                <textarea
                  required
                  autoFocus
                  value={regradeNote}
                  onChange={e => setRegradeNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[120px]"
                  placeholder="e.g. The AI missed that I used Big-O notation on the second line..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRegradeTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !regradeNote.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
