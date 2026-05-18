/**
 * src/pages/Home.jsx
 * Landing / overview page with quick actions.
 */

import { Link } from "react-router-dom";
import { Upload, CheckSquare, BarChart2, CheckCircle, Shield, Clock } from "lucide-react";
import { Card } from "../components/shared";

const QUICK_ACTIONS = [
  {
    to: "/upload",
    icon: Upload,
    color: "bg-blue-50 text-blue-600",
    label: "Upload Exam",
    desc: "Submit PDFs with a rubric for automated grading.",
  },
  {
    to: "/grades",
    icon: BarChart2,
    color: "bg-amber-50 text-amber-600",
    label: "Browse Grades",
    desc: "Filter, sort, export, and check plagiarism.",
  },
  {
    to: "/review",
    icon: CheckSquare,
    color: "bg-emerald-50 text-emerald-600",
    label: "Review Grades",
    desc: "Approve or override generated scores.",
  },
];

const FEATURES = [
  { icon: CheckCircle, title: "Automated Grading", desc: "OCR and automated logic grades exams in seconds with criterion-level justification." },
  { icon: CheckSquare, title: "TA Review Workflow", desc: "Approve or override any grade — bulk actions for efficiency." },
  { icon: Shield, title: "Plagiarism Detection", desc: "Automatic similarity scoring flags suspicious submissions." },
  { icon: Clock, title: "Async Job Tracking", desc: "Long-running grading jobs tracked in real time with progress logs." },
];

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-slide-up">
      {/* Hero */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-4">
          <CheckCircle className="w-3 h-3" /> Automated Grading Platform
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-3">
          Welcome to <span className="text-blue-600">GradeOps</span>
        </h1>
        <p className="text-slate-500 text-base max-w-xl">
          Upload exam PDFs, define rubrics, and let the system grade at scale — then review, approve, or override with one click.
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map(({ to, icon: Icon, color, label, desc }) => (
            <Link key={to} to={to}>
              <Card className="p-5 hover:border-indigo-200 hover:shadow-md transition-all duration-150 group cursor-pointer h-full">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">{label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Platform Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-0.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Backend status note */}
      <Card className="p-4 bg-blue-50/50 border-blue-100">
        <p className="text-xs text-blue-700 font-medium">
          📡 Backend expected at <code className="font-mono bg-blue-100 px-1 rounded">http://localhost:8000</code>.
          Demo data is shown automatically when the backend is unreachable.
        </p>
      </Card>
    </div>
  );
}