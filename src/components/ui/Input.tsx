import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
}

export function Input({ label, error, hint, className = "", id, ...rest }: InputProps) {
  const inputId = id ?? rest.name ?? "input-" + Math.random().toString(36).slice(2, 8);
  return (
    <div className="field">
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <input
        id={inputId}
        className={`input ${error ? "input--error" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  );
}