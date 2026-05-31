import { useState } from 'react';
import api from '../../api/client';
import { Search, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function PlagiarismView() {
  const [examId,    setExamId]    = useState('');
  const [minScore,  setMinScore]  = useState(0);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  async function load() {
    if (!examId.trim()) { setError('Enter an exam ID.'); return; }
    setError(''); setLoading(true); setData(null);
    try {
      const res = await api.getPlagiarism(examId.trim(), minScore / 100);
      setData(res);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Plagiarism Detector</h1>
        <p className="text-slate-500 text-sm">View AI-flagged similar submissions for an exam.</p>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              className="input pl-9" 
              placeholder="Exam ID"
              value={examId} 
              onChange={e => setExamId(e.target.value)}
              onKeyDown={e => e.key==='Enter' && load()} 
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <label className="text-sm font-medium text-slate-600">Min similarity</label>
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                className="input py-1 px-2 h-8 w-16 text-center" 
                min={0} max={100} step={5}
                value={minScore} 
                onChange={e => setMinScore(Number(e.target.value))} 
              />
              <span className="text-slate-400 text-sm font-semibold">%</span>
            </div>
          </div>
          
          <button className="btn-primary shrink-0" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan Exam'}
          </button>
        </div>
        
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="card p-6 flex flex-wrap gap-8 items-center bg-white">
            <div>
              <div className={`text-4xl font-bold font-display ${data.flagged_count > 0 ? 'text-red-600' : 'text-emerald-500'}`}>
                {data.flagged_count}
              </div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">flagged submissions</div>
            </div>
            
            <div className="h-12 w-px bg-slate-200 hidden sm:block" />
            
            <div className="text-slate-600 text-sm">
              Exam: <code className="font-mono text-xs bg-slate-100 text-indigo-600 px-2 py-1 rounded border border-slate-200">{data.exam_id}</code>
            </div>
          </div>

          {data.flagged_count === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/50 mt-6">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">No plagiarism detected</h3>
              <p className="text-sm text-emerald-700/80 mt-1 max-w-sm">All submissions appear to be unique at the ≥{minScore}% threshold.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Question</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Similarity</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{r.student_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">Q{r.question_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${r.plagiarism_similarity*100}%`,
                              backgroundColor: r.plagiarism_similarity > 0.9
                                ? '#ef4444' // red-500
                                : r.plagiarism_similarity > 0.75
                                  ? '#f59e0b' // amber-500
                                  : '#f43f5e', // rose-500 (flagged color)
                            }} />
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-700">{(r.plagiarism_similarity*100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-700 border border-red-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-xs" title={r.overall_justification}>
                        {r.overall_justification || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mt-6">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4 text-indigo-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No scan run yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">Enter an exam ID above to check for plagiarism flags.</p>
        </div>
      )}
    </div>
  );
}
