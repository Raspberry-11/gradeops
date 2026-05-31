import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Search, CheckCircle2, AlertTriangle, AlertCircle, Image as ImageIcon, Loader2, PartyPopper } from 'lucide-react';

export default function ReviewDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialExam = searchParams.get('exam') || '';

  const [examId,   setExamId]   = useState(initialExam);
  const [input,    setInput]    = useState(initialExam);
  const [items,    setItems]    = useState([]);
  const [cursor,   setCursor]   = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [stats,    setStats]    = useState(null);
  const [override, setOverride] = useState({ open: false, score: '', note: '' });
  const [toast,    setToast]    = useState('');
  const toastTimer = useRef(null);

  /* ── Load dashboard ── */
  const loadDashboard = useCallback(async (id) => {
    if (!id?.trim()) return;
    setLoading(true); setError(''); setItems([]); setCursor(0);
    try {
      const data = await api.getDashboard(id.trim());
      setItems(data.items || []);
      setStats({ total: data.total_grades, pending: data.pending });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (initialExam) loadDashboard(initialExam); }, []);

  /* ── Toast helper ── */
  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  /* ── Review action ── */
  const current = items[cursor];

  const doReview = useCallback(async (action, overrideScore = null, note = '') => {
    if (!current) return;
    const payload = {
      grade_id: current.grade.grade_id,
      ta_id:    user.user_id,
      action,
      ...(action === 'override' ? { override_score: parseFloat(overrideScore), override_note: note } : {}),
    };
    try {
      await api.reviewGrade(examId, payload);
      setItems(prev => prev.filter((_, i) => i !== cursor));
      setCursor(prev => Math.min(prev, items.length - 2));
      showToast(action === 'approve' ? '✓ Approved' : '✏ Overridden');
    } catch (err) { setError(err.message); }
  }, [current, cursor, examId, items.length, user]);

  /* ── Bulk approve all ── */
  async function bulkApproveAll() {
    const ids = items.map(i => i.grade.grade_id);
    if (!ids.length) return;
    try {
      await api.bulkApprove(examId, { grade_ids: ids, ta_id: user.user_id });
      setItems([]);
      showToast(`✓ Approved all ${ids.length} grades`);
    } catch (err) { setError(err.message); }
  }

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      if (!items.length || override.open) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'a': doReview('approve'); break;
        case 'o': setOverride({ open: true, score: String(current?.grade?.total_awarded || ''), note: '' }); break;
        case 'arrowdown':
        case 'j': e.preventDefault(); setCursor(p => Math.min(p + 1, items.length - 1)); break;
        case 'arrowup':
        case 'k': e.preventDefault(); setCursor(p => Math.max(p - 1, 0)); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, override.open, doReview]);

  /* ── Render ── */
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl font-medium text-sm flex items-center gap-2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Review Dashboard</h1>
          <p className="text-slate-500 text-sm flex items-center gap-2 flex-wrap">
            <span>Shortcuts:</span>
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] font-bold text-slate-600 shadow-sm">A</kbd> Approve
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] font-bold text-slate-600 shadow-sm ml-1">O</kbd> Override
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] font-bold text-slate-600 shadow-sm ml-1">↑↓</kbd> Navigate
          </p>
        </div>
        {items.length > 0 && (
          <button className="btn-secondary whitespace-nowrap" onClick={bulkApproveAll}>
            ✓ Approve All ({items.length})
          </button>
        )}
      </div>

      {/* Exam ID input */}
      <div className="card p-4 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              className="input pl-9"
              placeholder="Exam ID to review"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setExamId(input), loadDashboard(input))}
            />
          </div>
          <button className="btn-primary shrink-0"
            onClick={() => { setExamId(input); loadDashboard(input); }}
            disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Dashboard'}
          </button>
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="card p-4 flex flex-col sm:flex-row items-center gap-4 text-sm">
          <div className="flex gap-6">
            <span className="text-slate-500">Total: <b className="text-slate-900">{stats.total}</b></span>
            <span className="text-slate-500">Pending: <b className="text-amber-600">{items.length}</b></span>
          </div>
          {stats.total > 0 && (
            <div className="flex-1 w-full flex items-center gap-3">
              <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${((stats.total - items.length) / stats.total) * 100}%` }} />
              </div>
              <span className="text-slate-400 text-xs font-semibold whitespace-nowrap w-12 text-right">
                {(((stats.total - items.length) / stats.total) * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Loading grades to review…</span>
        </div>
      )}

      {!loading && items.length === 0 && examId && (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/50 mt-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
            <PartyPopper className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-emerald-900">All caught up!</h3>
          <p className="text-sm text-emerald-700/80 mt-1 max-w-sm">No pending grades to review for this exam.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          {/* Grade list (left) */}
          <div className="lg:col-span-1 card overflow-y-auto overflow-x-hidden flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Queue ({items.length})</h3>
            </div>
            <div className="flex flex-col p-2 gap-2">
              {items.map((item, idx) => {
                const isActive = idx === cursor;
                const isPlag = item.grade.plagiarism_flag;
                return (
                  <div
                    key={item.grade.grade_id}
                    onClick={() => setCursor(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive 
                        ? (isPlag ? 'bg-red-50 border-red-300 ring-2 ring-red-200 shadow-sm' : 'bg-white border-indigo-300 ring-2 ring-indigo-100 shadow-sm scale-[1.02] z-10')
                        : (isPlag ? 'bg-white border-red-200 hover:bg-red-50/50' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-mono text-sm font-semibold truncate ${isActive && isPlag ? 'text-red-900' : 'text-slate-800'}`}>
                        {item.grade.student_id}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                        item.grade.status === 'ai_graded' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        item.grade.status === 'pending_regrade' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.grade.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Q{item.grade.question_number}</span>
                      <span className={`font-mono font-bold ${isActive && !isPlag ? 'text-indigo-600' : 'text-slate-600'}`}>
                        {item.grade.total_awarded}/{item.grade.total_possible}
                      </span>
                    </div>
                    {isPlag && (
                      <div className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1 bg-red-100/50 py-1 px-2 rounded-md">
                        <AlertTriangle className="w-3 h-3" />
                        Sim: {(item.grade.plagiarism_similarity * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grade detail (right) */}
          <div className="lg:col-span-2 flex flex-col h-full">
            {current && (
              <div className="card flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex-1 overflow-y-auto p-6">
                  <GradeDetail
                    item={current}
                  />
                </div>
                
                {/* Actions fixed at bottom */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-4">
                  <button className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 h-12 text-[15px] shadow-sm shadow-emerald-600/20" onClick={() => doReview('approve')}>
                    <CheckCircle2 className="w-5 h-5 mr-1" /> Approve <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">A</kbd>
                  </button>
                  <button className="flex-1 btn-primary bg-rose-600 hover:bg-rose-700 h-12 text-[15px] shadow-sm shadow-rose-600/20" onClick={() => setOverride({ open: true, score: String(current.grade.total_awarded), note: '' })}>
                    <AlertCircle className="w-5 h-5 mr-1" /> Override <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">O</kbd>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Override modal */}
      {override.open && current && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setOverride(o => ({...o, open: false}))}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Override Grade</h3>
              <p className="text-sm text-slate-500 mt-1">
                Student <b className="font-mono text-slate-700">{current.grade.student_id}</b> — Q{current.grade.question_number}
                <br/>(AI score: {current.grade.total_awarded}/{current.grade.total_possible})
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="label">New Score (max {current.grade.total_possible})</label>
                <input type="number" className="input text-lg font-mono py-3"
                  min="0" max={current.grade.total_possible} step="0.5"
                  value={override.score}
                  onChange={e => setOverride(o => ({...o, score: e.target.value}))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <textarea className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
                  style={{ minHeight: 100 }}
                  placeholder="Reason for override…"
                  value={override.note}
                  onChange={e => setOverride(o => ({...o, note: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button className="flex-1 btn-primary" onClick={() => {
                doReview('override', override.score, override.note);
                setOverride({ open: false, score: '', note: '' });
              }}>
                Confirm Override
              </button>
              <button className="flex-1 btn-secondary" onClick={() => setOverride(o => ({...o, open: false}))}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GradeDetail({ item }) {
  const { grade } = item;
  const pct = ((grade.total_awarded / grade.total_possible) * 100).toFixed(0);
  const isGood = pct >= 70;
  const isWarn = pct >= 40 && pct < 70;
  
  const scoreColor = isGood ? 'text-emerald-600' : isWarn ? 'text-amber-500' : 'text-rose-500';
  const scoreBg = isGood ? 'bg-emerald-50 border-emerald-200' : isWarn ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-mono text-2xl font-bold text-slate-900">
            {grade.student_id}
          </div>
          <div className="text-slate-500 text-sm font-medium mt-1">Question {grade.question_number}</div>
        </div>
        <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-sm ${scoreBg} ${scoreColor}`}>
          <span className="text-2xl font-bold font-mono leading-none">{grade.total_awarded}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-current/20 mt-1 pt-1 w-12 text-center">/{grade.total_possible}</span>
        </div>
      </div>

      {grade.plagiarism_flag && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <h4 className="text-sm font-bold">Possible Plagiarism Detected</h4>
            <p className="text-sm mt-1 opacity-90">Similarity score: {(grade.plagiarism_similarity * 100).toFixed(0)}%</p>
          </div>
        </div>
      )}

      {grade.status === 'pending_regrade' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Student Regrade Request</h4>
            <p className="text-sm mt-1 italic text-amber-700 opacity-90">"{grade.regrade_request_note}"</p>
          </div>
        </div>
      )}

      {/* Crop image — student's handwritten answer */}
      {item.crop_path && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Student Answer
          </h4>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden shadow-sm">
            <img
              src={item.crop_path}
              alt={`Cropped answer for ${grade.student_id} Q${grade.question_number}`}
              className="w-full h-auto rounded-lg"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      {/* OCR Text */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Transcribed Answer</h4>
        <div className="rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm text-slate-700 leading-relaxed shadow-sm">
          {grade.ocr_text || <span className="text-slate-400 italic">No text extracted</span>}
        </div>
      </div>

      {/* Justification */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">AI Justification</h4>
        <p className="text-[15px] leading-relaxed text-slate-700 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          {grade.overall_justification || '—'}
        </p>
      </div>

      {/* Criterion breakdown */}
      {grade.criterion_scores?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Criterion Breakdown</h4>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
            {grade.criterion_scores.map(c => (
              <div key={c.criterion_id} className="flex gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 text-sm text-slate-700 leading-relaxed">{c.justification}</div>
                <div className={`font-mono font-bold shrink-0 ${c.awarded_points > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  +{c.awarded_points}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
