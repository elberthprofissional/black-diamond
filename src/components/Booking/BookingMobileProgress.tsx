import { type FC } from 'react';
import { User, Scissors, Calendar, FileText, Sparkles } from 'lucide-react';

interface BookingMobileProgressProps {
  step: number;
  stepTitle: string;
  onBack: () => void;
  totalSteps?: number;
}

const STEP_ICONS_4: FC<{ size?: number; className?: string }>[] = [
  User,
  Scissors,
  Calendar,
  FileText,
];
const STEP_LABELS_4 = ['Dados', 'Serviços', 'Data/Hora', 'Revisar'];
const STEP_ICONS_5: FC<{ size?: number; className?: string }>[] = [
  User,
  Scissors,
  Sparkles,
  Calendar,
  FileText,
];
const STEP_LABELS_5 = ['Dados', 'Serviços', 'Barbeiro', 'Data/Hora', 'Revisar'];

const BookingMobileProgress: FC<BookingMobileProgressProps> = ({
  step,
  stepTitle,
  onBack,
  totalSteps = 4,
}) => {
  const hasBarberStep = totalSteps === 5;
  const icons = hasBarberStep ? STEP_ICONS_5 : STEP_ICONS_4;
  const labels = hasBarberStep ? STEP_LABELS_5 : STEP_LABELS_4;
  const progressPct = Math.max(10, ((step - 1) / (totalSteps - 1)) * 100);
  return (
    <header className="px-4 pt-3 pb-3 shrink-0 border-b border-white/[0.04] bg-[#050505] sticky top-0 z-50">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="text-zinc-500 hover:text-white transition-all cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-white">{stepTitle}</h1>
        </div>
      </div>
      <div className="relative flex justify-between items-center w-full mt-3 px-4 pb-0.5 select-none">
        <div className="absolute left-0 right-0 -mx-4 top-[28px] h-[1px] bg-white/10 z-0" />
        <div className="absolute left-0 -ml-4 top-[28px] h-[1px] bg-white/10 z-0" />
        <div
          className="absolute left-0 -ml-4 top-[28px] h-[1px] bg-gold transition-all duration-500 z-0"
          style={{
            width: `${progressPct}%`,
          }}
        />
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
          const Icon = icons[s - 1];
          if (!Icon) return null;
          const isCompleted = step > s;
          const isActive = step === s;
          return (
            <div
              key={`m-step-${s}`}
              className="flex flex-col items-center relative z-10"
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="h-5 flex items-center justify-center mb-1">
                <Icon
                  size={12}
                  className={
                    isActive ? 'text-gold' : isCompleted ? 'text-gold/80' : 'text-zinc-600'
                  }
                />
              </div>
              <div
                className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 ${
                  isActive
                    ? 'bg-gold border-gold shadow-[0_0_8px_rgba(197,160,89,0.5)]'
                    : isCompleted
                      ? 'bg-gold border-gold'
                      : 'bg-[#050505] border-white/20'
                }`}
              />
              <span
                className={`text-[10px] font-bold mt-1 transition-colors duration-500 tracking-wider text-center ${
                  isActive ? 'text-gold' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {labels[s - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
};

export default BookingMobileProgress;
