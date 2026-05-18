/**
 * src/components/Modal.jsx
 * Generic, accessible modal. Closes on Escape or backdrop click.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Trap focus
    const prev = document.activeElement;
    dialogRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size] ?? "max-w-lg";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${maxW} bg-white rounded-2xl shadow-2xl border border-slate-200 animate-slide-up outline-none flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-slate-800">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}