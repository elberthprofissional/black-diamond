import { Check } from 'lucide-react';

interface Step {
  step: number;
  label: string;
}

interface BookingStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  canNavigateTo?: (step: number) => boolean;
  onStepClick?: (step: number) => void;
  variant?: 'desktop' | 'mobile';
}

export default function BookingStepIndicator({
  steps,
  currentStep,
  canNavigateTo,
  onStepClick,
  variant = 'desktop',
}: BookingStepIndicatorProps) {
  if (variant === 'mobile') {
    return (
      <div className="px-5 pb-3 flex items-center gap-2">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.step;
          const isPassed = s.step < currentStep;
          return (
            <div
              key={s.step}
              className="flex items-center gap-1.5 min-w-0 flex-1"
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center text-[8px] font-bold rounded-full transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#C5A059] text-black'
                    : isPassed
                      ? 'bg-[#C5A059]/20 text-[#C5A059]'
                      : 'bg-white/[0.06] text-zinc-600'
                }`}
              >
                {isPassed ? <Check size={10} strokeWidth={3} /> : s.step}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider truncate transition-all ${
                  isActive ? 'text-[#C5A059]' : isPassed ? 'text-white/50' : 'text-zinc-600'
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                    isPassed ? 'bg-[#C5A059]/30' : 'bg-white/[0.06]'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex items-center gap-0">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.step;
        const isPassed = s.step < currentStep;
        const canClick = canNavigateTo ? canNavigateTo(s.step) : isPassed;
        return (
          <div key={s.step} className="contents">
            <button
              disabled={!canClick}
              onClick={() => canClick && onStepClick?.(s.step)}
              className="flex items-center gap-2.5 transition-all cursor-pointer group shrink-0"
            >
              <div
                className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all rounded-xl ${
                  isActive
                    ? 'bg-[#C5A059] text-black'
                    : isPassed
                      ? 'bg-[#C5A059]/15 text-[#C5A059]'
                      : 'bg-white/[0.04] text-zinc-600 border border-white/[0.04] group-hover:border-white/[0.1]'
                }`}
              >
                {isPassed ? <Check size={12} strokeWidth={3} /> : s.step}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                  isActive
                    ? 'text-[#C5A059]'
                    : isPassed
                      ? 'text-white/50'
                      : 'text-zinc-600 group-hover:text-zinc-400'
                }`}
              >
                {s.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-[1px] mx-4 transition-all ${
                  isPassed ? 'bg-[#C5A059]/30' : 'bg-white/[0.04]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
