import { Fragment, type FC } from 'react';

interface BookingDesktopProgressProps {
  step: number;
  stepTitle: string;
  goBack?: () => void;
}

const STEP_LABELS = ['', 'Dados', 'Serviços', 'Horário', 'Confirmar'];

const BookingDesktopProgress: FC<BookingDesktopProgressProps> = ({ step, stepTitle, goBack }) => {
  if (step >= 5) return null;

  return (
    <div className="px-14 py-6 flex items-center justify-between border-b border-white/[0.04]">
      <div className="flex items-center gap-5">
        {step > 1 && step < 5 && goBack && (
          <button
            onClick={goBack}
            aria-label="Voltar para o passo anterior"
            className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5m7-7-7 7 7 7" />
            </svg>
          </button>
        )}
        {step < 5 && (
          <div>
            <h2 className="text-xl font-bold text-white">{stepTitle}</h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {step === 1 && 'Preencha suas informações'}
              {step === 2 && 'Escolha os serviços'}
              {step === 3 && 'Defina data e horário'}
              {step === 4 && 'Revise e confirme'}
            </p>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="flex items-center gap-3" role="list" aria-label="Progresso do agendamento">
          {[1, 2, 3, 4].map((s, i) => (
            <Fragment key={s}>
              <div
                role="listitem"
                aria-current={step === s ? 'step' : undefined}
                aria-label={`Passo ${s}${step === s ? ' (atual)' : step > s ? ' (concluído)' : ''}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  step === s
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                    : step > s
                      ? 'text-zinc-400'
                      : 'text-zinc-600'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s
                      ? 'bg-[#D4AF37] text-black'
                      : step > s
                        ? 'bg-white/10 text-white'
                        : 'bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  {step > s ? '✓' : s}
                </span>
                <span className="hidden xl:inline text-zinc-400">{STEP_LABELS[s]}</span>
              </div>
              {i < 3 && (
                <div className={`w-6 h-px ${step > s ? 'bg-[#D4AF37]/30' : 'bg-white/[0.06]'}`} />
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingDesktopProgress;
