import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Loader2, Download, Search, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function ExamsList() {
  const [examId,    setExamId]    = useState('');
  const [grades,    setGrades]    = useState(null);
  const [plag,      setPlag]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState('grades');
  const [examsList, setExamsList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  /* ── Auto-load exam list on mount ── */
  useEffect(() => {
    api.listExams()
      .then(data => setExamsList(data.exams || []))
      .catch(() => setExamsList([]))
      .finally(() => setListLoading(false));
  }, []);

  async function loadExam(id) {
    const target = (id ?? examId).trim();
    if (!target) { setError('Enter an Exam ID.'); return; }
    setError(''); setLoading(true); setGrades(null); setPlag(null); setExamId(target);
    try {
      const [g, p] = await Promise.all([
        api.getGrades(target),
        api.getPlagiarism(target),
      ]);
      setGrades(g);
      setPlag(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stats = grades ? {
    total: grades.length,
    approved: grades.filter(g => g.status === 'approved').length,
    pending: grades.filter(g => ['ai_graded','pending'].includes(g.status)).length,
    flagged: grades.filter(g => g.status === 'flagged' || g.plagiarism_flag).length,
    avgScore: grades.length
      ? (grades.reduce((s, g) => s + g.total_awarded, 0) / grades.length).toFixed(1)
      : 0,
  } : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Exam Results</h1>
        <p className="text-slate-500 text-sm">Select an exam from the list below, or paste an ID directly.</p>
      </div>

      {/* Exam list */}
      {listLoading ? (
        <div className="card p-6 flex justify-center text-slate-500 text-sm items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading exams…
        </div>
      ) : examsList.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-800">My Exams</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Exam ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Course</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Students</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                  <th className="px-4 py-3 border-b border-slate-200"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examsList.map(ex => (
                  <tr key={ex.exam_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{ex.exam_id}</td>
                    <td className="px-4 py-3 text-slate-600">{ex.course_id || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{ex.student_count}</td>
                    <td className="px-4 py-3">
                      {ex.processed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-700">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-secondary text-xs px-3 py-1.5"
                        onClick={() => loadExam(ex.exam_id)}>
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Exam lookup */}
      <div className="card p-4 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Paste Exam ID (UUID)"
              value={examId}
              onChange={e => setExamId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadExam()}
            />
          </div>
          <button className="btn-primary shrink-0" onClick={() => loadExam()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Exam'}
          </button>
          {grades && (
            <a
              href={api.exportGradesUrl(examId.trim())}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </a>
          )}
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Grades" value={stats.total} />
            <StatCard label="Avg Score"    value={stats.avgScore} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
            <StatCard label="Approved"     value={stats.approved} color="text-emerald-700 bg-emerald-50 border-emerald-100" />
            <StatCard label="Pending"      value={stats.pending}  color="text-amber-700 bg-amber-50 border-amber-100" />
            <StatCard label="Flagged"      value={stats.flagged}  color="text-red-700 bg-red-50 border-red-100" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
            {['grades','plagiarism'].map(t => (
              <button
                key={t}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setTab(t)}
              >
                {t === 'grades' ? `📊 Grades (${grades.length})` : `🔍 Plagiarism (${plag?.flagged_count ?? 0})`}
              </button>
            ))}
          </div>

          {tab === 'grades' && <GradesTable grades={grades} />}
          {tab === 'plagiarism' && <PlagTable data={plag} />}
        </div>
      )}

      {!grades && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mt-6">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No exam loaded</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">Enter an exam ID above to view results and export grades.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`card p-4 flex flex-col items-center justify-center text-center ${color || 'border-slate-200 bg-white'}`}>
      <div className={`text-2xl font-bold font-display ${color ? color.split(' ')[0] : 'text-slate-900'}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status, sim }) {
  if (status === 'approved') return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
  if (status === 'flagged') return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-700 border border-red-200">Flagged</span>;
  if (status === 'ai_graded') return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">AI Graded</span>;
  if (sim != null) return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-700 border border-red-200">⚠ {Math.round(sim*100)}%</span>;
  return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
}

function GradesTable({ grades }) {
  if (!grades.length) return <div className="p-8 text-center text-slate-500 text-sm">No grades found.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Q#</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Possible</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">%</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plagiarism</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {grades.map(g => (
            <tr key={g.grade_id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{g.student_id}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{g.question_number}</td>
              <td className="px-4 py-3 font-mono text-sm font-semibold text-indigo-600">{g.total_awarded}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{g.total_possible}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{((g.total_awarded / g.total_possible) * 100).toFixed(0)}%</td>
              <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
              <td className="px-4 py-3">
                {g.plagiarism_flag
                  ? <StatusBadge sim={g.plagiarism_similarity} />
                  : <span className="text-slate-400 text-xs">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlagTable({ data }) {
  if (!data || data.flagged_count === 0)
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 mt-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
        <p className="text-sm font-semibold text-emerald-700">No plagiarism flagged.</p>
      </div>
    );
  return (
    <div className="card overflow-x-auto mt-4">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student A</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student B</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Q#</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Similarity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.results.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{r.student_id}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">—</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.question_number}</td>
              <td className="px-4 py-3"><StatusBadge sim={r.plagiarism_similarity} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
