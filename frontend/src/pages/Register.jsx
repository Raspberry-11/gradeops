import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Loader2, Info } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ email: '', full_name: '', password: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await register(form);
      setSuccess('Account created! You can now log in as a TA.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Create an Account</h1>
          <p className="text-sm text-slate-500 mt-2">Join GradeOps as a Teaching Assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input name="full_name" type="text" className="input"
              placeholder="Dr. Jane Smith" value={form.full_name}
              onChange={onChange} required autoFocus />
          </div>
          <div>
            <label className="label">Email address</label>
            <input name="email" type="email" className="input"
              placeholder="you@university.edu" value={form.email}
              onChange={onChange} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" className="input"
              placeholder="••••••••" value={form.password}
              onChange={onChange} required />
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100 mt-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-[13px] leading-relaxed text-blue-800">
              All new accounts are registered as <strong>Teaching Assistants</strong>.
              Instructor accounts must be promoted by admins.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
             <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
               {success}
             </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center h-11 text-[15px] mt-2" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating…</> : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
