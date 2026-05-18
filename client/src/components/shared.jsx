/**
 * src/components/shared.jsx
 * Lightweight shared components: Spinner, Tag, Button, Card.
 */

// ── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = "md", className = "" }) {
  const sz = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }[size] ?? "w-6 h-6";
  return (
    <svg
      className={`animate-spin text-indigo-600 ${sz} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Tag / Badge ───────────────────────────────────────────────────────────────

const TAG_STYLES = {
  pending:    "bg-amber-50  text-amber-700  border-amber-200",
  ai_graded:  "bg-blue-50   text-blue-700   border-blue-200",
  approved:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  overridden: "bg-purple-50 text-purple-700  border-purple-200",
  flagged:    "bg-red-50    text-red-700     border-red-200",
  default:    "bg-slate-100 text-slate-600   border-slate-200",
};

export function Tag({ status, label, className = "" }) {
  const style = TAG_STYLES[status] ?? TAG_STYLES.default;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}>
      {label ?? status}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({ variant = "primary", children, className = "", ...props }) {
  const cls = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all duration-150 disabled:opacity-50",
  }[variant] ?? "btn-primary";
  return (
    <button className={`${cls} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-indigo-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────────

export function ScoreBar({ awarded, possible, className = "" }) {
  const pct = possible > 0 ? Math.min(100, (awarded / possible) * 100) : 0;
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-600 whitespace-nowrap">
        {awarded}/{possible}
      </span>
    </div>
  );
}