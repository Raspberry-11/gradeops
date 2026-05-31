import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Upload, ClipboardList, CheckSquare, Search,
  GraduationCap, User, Menu, X, ChevronRight, Activity, LogOut
} from 'lucide-react';

const INSTRUCTOR_NAV = [
  { to: '/instructor/upload', icon: Upload, label: 'Upload Exam' },
  { to: '/instructor/exams',  icon: ClipboardList, label: 'My Exams' },
];

const TA_NAV = [
  { to: '/ta/review',      icon: CheckSquare, label: 'Review Grades' },
  { to: '/ta/plagiarism',  icon: Search, label: 'Plagiarism' },
];

const STUDENT_NAV = [
  { to: '/student/dashboard', icon: ClipboardList, label: 'My Exams' },
];

function NavLinks({ nav, onClick }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 space-y-0.5">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onClick}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
          }
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-[.active]:opacity-100 text-indigo-500" />
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  let nav = TA_NAV;
  if (user?.role === 'instructor') nav = INSTRUCTOR_NAV;
  if (user?.role === 'student') nav = STUDENT_NAV;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 py-5 px-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-base font-bold text-slate-900 tracking-tight">
            GradeOps
          </span>
        </div>

        <div className="px-3 mb-4">
           <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
             {user?.role}
           </span>
        </div>

        <NavLinks nav={nav} />

        {/* User placeholder */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.full_name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col py-5 px-3 transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between px-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-base font-bold text-slate-900">GradeOps</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 mb-4">
           <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
             {user?.role}
           </span>
        </div>
        <NavLinks nav={nav} onClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-sm font-bold text-slate-900">GradeOps</span>
          </div>
        </header>

        {/* Desktop topbar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
          <div /> {/* Spacer */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>Backend</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
