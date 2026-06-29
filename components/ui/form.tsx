"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function FormField({ label, hint, error, required, children, className }: {
  label: string; hint?: string; error?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="font-normal text-vault-muted ml-1.5 text-xs">— {hint}</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400" data-form-error>
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ error, prefix, suffix, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string; prefix?: React.ReactNode; suffix?: React.ReactNode }) {
  if (prefix || suffix) {
    return (
      <div className="relative">
        {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted pointer-events-none">{prefix}</div>}
        <input {...props} className={cn("vault-input", prefix && "pl-8", suffix && "pr-8", error && "border-red-900/50 bg-red-950/5", className)} />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-muted pointer-events-none">{suffix}</div>}
      </div>
    );
  }
  return <input {...props} className={cn("vault-input", error && "border-red-900/50 bg-red-950/5", className)} />;
}

export function Textarea({ error, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea {...props} className={cn("vault-input resize-none", error && "border-red-900/50 bg-red-950/5", className)} />;
}

export function Select({ error, options, placeholder, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select {...props} className={cn("vault-input", error && "border-red-900/50 bg-red-950/5", className)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function PasswordInput({ error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={cn("vault-input pr-10", error && "border-red-900/50", className)} />
      <button type="button" onClick={() => setShown(!shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text transition-colors" tabIndex={-1}>
        {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/30 border border-red-900/50" data-form-error>
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}

export function CharCounter({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  return (
    <p className={cn("text-[11px] text-right mt-1", remaining < 0 ? "text-red-400" : remaining < max * 0.15 ? "text-yellow-400" : "text-vault-muted")}>
      {remaining} remaining
    </p>
  );
}
