import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
}

export function Select({ label, error, className = "", id, children, ...rest }: SelectProps) {
  const selectId = id ?? rest.name ?? "select-" + Math.random().toString(36).slice(2, 8);
  return (
    <div className="field">
      {label ? <label htmlFor={selectId}>{label}</label> : null}
      <select
        id={selectId}
        className={`input select ${error ? "input--error" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}