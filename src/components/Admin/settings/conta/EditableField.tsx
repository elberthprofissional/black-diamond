import { useEffect, useRef, type FC, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/* ─── Campo editavel reutilizavel ───
 * Usado nos 5 campos do SettingsConta (nome, telefone, bio, frase, instagram).
 * Desktop: inline edit (visualizacao → clique → editavel).
 * Mobile: card que abre MobileEditScreen (tela cheia). */

interface EditableFieldProps {
  label: string;
  value: string;
  displayValue: string;
  /** Placeholder quando valor esta vazio */
  placeholder: string;
  /** Componente de input para desktop (ex: <input type="text" />) */
  renderInput: (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => ReactNode;
  /** Componente de input para mobile (ex: <input type="text" />) */
  renderMobileInput: (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  ) => ReactNode;
  /** Texto auxiliar no mobile (ex: contador de caracteres) */
  mobileHelper?: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  canSave: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  MobileEditScreen: FC<MobileEditScreenProps>;
}

interface MobileEditScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  canSave: boolean;
  children: ReactNode;
}

const EditableField: FC<EditableFieldProps> = ({
  label,
  value,
  displayValue,
  placeholder,
  renderInput,
  renderMobileInput,
  mobileHelper,
  onSave,
  onCancel,
  canSave,
  isEditing,
  setIsEditing,
  MobileEditScreen: MobileScreen,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const showPlaceholder = !value || value.trim() === '';

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
          {isEditing ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {label}
                </span>
                {mobileHelper && <span className="text-[10px] text-zinc-600">{mobileHelper}</span>}
              </div>
              <div className="flex gap-2">
                {renderInput(inputRef)}
                <button
                  onClick={onSave}
                  disabled={!canSave}
                  className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              <div className="text-left">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                  {label}
                </span>
                <span className={`text-[13px] ${showPlaceholder ? 'text-zinc-500' : 'text-white'}`}>
                  {showPlaceholder ? placeholder : displayValue}
                </span>
              </div>
              <ChevronRight size={16} className="text-zinc-600 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
              {label}
            </span>
            <span className={`text-[13px] ${showPlaceholder ? 'text-zinc-500' : 'text-white'}`}>
              {showPlaceholder ? placeholder : displayValue}
            </span>
          </div>
          <ChevronRight size={16} className="text-zinc-600 shrink-0" />
        </button>
      </div>

      {/* Mobile Full-Screen Editor */}
      <MobileScreen
        isOpen={isEditing}
        onClose={onCancel}
        onSave={onSave}
        title={label}
        canSave={canSave}
      >
        {renderMobileInput(inputRef)}
        {mobileHelper && <p className="text-[11px] text-zinc-600 text-right">{mobileHelper}</p>}
      </MobileScreen>
    </>
  );
};

export default EditableField;
