import { type FC } from 'react';
import { User, Scissors, Clock, Check } from 'lucide-react';

interface BookingMobileProgressProps {
  step: number;
  stepTitle: string;
  onBack: () => void;
}

const STEP_ICONS: FC<{ size?: number; className?: string }>[] = [User, Scissors, Clock, Check];
const STEP_LABELS = ['Dados', 'Serviços', 'Agenda', 'Revisar'];

const BookingMobileProgress: FC<BookingMobileProgressProps> = ({ step, stepTitle, onBack }) => {
  return (
    <header className="px-5 pt-5 pb-4 shrink-0 border-b border-white/[0.04] bg-[#050505] sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="text-zinc-500 hover:text-white transition-all cursor-pointer"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">{stepTitle}</h1>
        </div>
      </div>
      <div className="relative flex justify-between items-center w-full mt-4 px-4 pb-1 select-none">
        <div className="absolute left-0 right-0 -mx-9 top-[28px] h-[1px] bg-white/10 z-0" />
        <div
          className="absolute left-0 -ml-9 top-[28px] h-[1px] bg-[#D4AF37] transition-all duration-500 z-0"
          style={{
            width:
              step === 1
                ? '40px'
                : step === 2
                  ? 'calc(33.33% + 13.33px)'
                  : step === 3
                    ? 'calc(66.66% - 13.33px)'
                    : 'calc(100% + 72px)',
          }}
        />
        {[1, 2, 3, 4].map((s) => {
          const Icon = STEP_ICONS[s - 1];
          if (!Icon) return null;
          const isCompleted = step > s;
          const isActive = step === s;
          return (
            <div
              key={`m-step-${s}`}
              className="flex flex-col items-center relative z-10 w-12"
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="h-5 flex items-center justify-center mb-1">
                <Icon
                  size={13}
                  className={
                    isActive
                      ? 'text-[#D4AF37]'
                      : isCompleted
                        ? 'text-[#D4AF37]/80'
                        : 'text-zinc-600'
                  }
                />
              </div>
              <div
                className={`w-2 h-2 rounded-full border transition-all duration-500 ${
                  isActive
                    ? 'bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_8px_rgba(197,160,89,0.5)]'
                    : isCompleted
                      ? 'bg-[#D4AF37] border-[#D4AF37]'
                      : 'bg-[#050505] border-white/20'
                }`}
              />
              <span
                className={`text-[9px] font-bold mt-1.5 transition-colors duration-500 tracking-wider text-center ${
                  isActive ? 'text-[#D4AF37]' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {STEP_LABELS[s - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
};

export default BookingMobileProgress;
