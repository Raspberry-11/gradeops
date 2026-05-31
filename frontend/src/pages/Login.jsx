import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      let target = '/ta/review';
      if (user.role === 'instructor') target = '/instructor/exams';
      if (user.role === 'student') target = '/student/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role) {
    if (role === 'instructor') {
      setEmail('instructor@gradeops.dev');
      setPassword('instructor123');
    } else if (role === 'ta') {
      setEmail('ta@gradeops.dev');
      setPassword('ta123');
    } else if (role === 'student') {
      setEmail('student@gradeops.dev');
      setPassword('student123');
    }
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_40%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.05),transparent_40%)]" />

      <div className="card w-full max-w-[420px] p-8 z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-sm shadow-indigo-600/20">
            <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Welcome to GradeOps</h1>
          <p className="text-sm text-slate-500 mt-2">AI-Powered Exam Grading Pipeline</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button 
            type="button"
            onClick={() => fillDemo('instructor')}
            className="flex-1 py-2 px-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
          >
            Instructor
          </button>
          <button 
            type="button"
            onClick={() => fillDemo('ta')}
            className="flex-1 py-2 px-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
          >
            TA
          </button>
          <button 
            type="button"
            onClick={() => fillDemo('student')}
            className="flex-1 py-2 px-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
          >
            Student
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or sign in</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center h-11 text-[15px]"
            disabled={loading}
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
