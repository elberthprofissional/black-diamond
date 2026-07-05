import React from 'react';
import { ChevronRight } from 'lucide-react';

interface InlineEditFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  displayValue?: string;
  isEditing: boolean;
  onEdit: () => void;
  isTextarea?: boolean;
  children: React.ReactNode;
}

const InlineEditField: React.FC<InlineEditFieldProps> = ({
  label,
  value,
  placeholder,
  displayValue,
  isEditing,
  onEdit,
  isTextarea,
  children,
}) => {
  return (
    <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
      {isEditing ? (
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              {label}
            </span>
            {isTextarea ? (
              <span className="text-[10px] text-zinc-600">{(value as string).length}/200</span>
            ) : null}
          </div>
          {children}
        </div>
      ) : (
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          <div className="text-left max-w-[85%]">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
              {label}
            </span>
            <span
              className={`text-[13px] ${displayValue ? 'text-zinc-400' : 'text-white'} line-clamp-1`}
            >
              {displayValue || value || placeholder || '—'}
            </span>
          </div>
          <ChevronRight size={16} className="text-zinc-600 shrink-0" />
        </button>
      )}
    </div>
  );
};

export default InlineEditField;
