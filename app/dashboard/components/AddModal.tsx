"use client";

import { ReactNode, useEffect } from "react";

interface AddModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  accentColor: string;
  children: ReactNode;
  submitLabel?: string;
}

export default function AddModal({
  title,
  open,
  onClose,
  onSubmit,
  accentColor,
  children,
  submitLabel = "Save",
}: AddModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(10,20,40,0.95) 0%, rgba(5,15,30,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }}
        />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
          <h2
            className="text-lg font-semibold"
            style={{ color: accentColor }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accentColor}cc 0%, ${accentColor}66 100%)`,
              border: `1px solid ${accentColor}60`,
              boxShadow: `0 0 20px ${accentColor}40`,
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable form field components
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export function FormInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/25 outline-none transition-all focus:ring-1 focus:ring-white/20"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    />
  );
}

export function FormSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:ring-1 focus:ring-white/20 cursor-pointer"
      style={{
        background: "rgba(15,25,45,0.95)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
