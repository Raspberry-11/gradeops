/**
 * src/context/ToastContext.jsx
 * Lightweight global toast system.
 */

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

let _id = 0;

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  info: <AlertCircle className="w-4 h-4 text-indigo-500" />,
};

const BG = {
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
  info: "border-indigo-200 bg-indigo-50",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${BG[t.type]}`}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <p className="text-sm font-medium text-slate-800 flex-1">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};