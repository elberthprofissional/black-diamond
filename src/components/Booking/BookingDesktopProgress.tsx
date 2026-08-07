import { Fragment, type FC } from 'react';

interface BookingDesktopProgressProps {
  step: number;
  stepTitle: string;
  goBack?: () => void;
  totalSteps?: number;
}

const STEP_LABELS_4 = ['', 'Dados', 'Serviços', 'Horário'];
const STEP_LABELS_5 = ['', 'Dados', 'Serviços', 'Barbeiro', 'Horário'];

const BookingDesktopProgress: FC<BookingDesktopProgressProps> = ({
  step,
  stepTitle,
  goBack,
  totalSteps = 4,
}) => {
  const hasBarberStep = totalSteps === 5;
  // A última etapa (revisão) não mostra o progresso
  const lastShown = totalSteps - 1;
  if (step >= totalSteps) return null;

  const labels = hasBarberStep ? STEP_LABELS_5 : STEP_LABELS_4;
  const subtitle =
    step === 1
      ? 'Preencha suas informações'
      : step === 2
        ? 'Escolha os serviços'
        : step === 3
          ? hasBarberStep
            ? 'Escolha o barbeiro'
            : 'Defina data e horário'
          : step === 4
            ? 'Defina data e horário'
            : '';

  return (
    <div className="px-6 lg:px-10 xl:px-14 py-4 lg:py-6 flex items-center justify-between border-b border-white/[0.04]">
      <div className="flex items-center gap-5">
        {step > 1 && step < totalSteps && goBack && (
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
        {step < totalSteps && (
          <div>
            <h2 className="text-lg xl:text-xl font-bold text-white">{stepTitle}</h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">{subtitle}</p>
          </div>
        )}
      </div>

      {step < totalSteps && (
        <div className="flex items-center gap-3" role="list" aria-label="Progresso do agendamento">
          {Array.from({ length: lastShown }, (_, i) => i + 1).map((s, i) => (
            <Fragment key={s}>
              <div
                role="listitem"
                aria-current={step === s ? 'step' : undefined}
                aria-label={`Passo ${s}${step === s ? ' (atual)' : step > s ? ' (concluído)' : ''}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  step === s ? 'bg-gold/10 text-gold' : step > s ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s
                      ? 'bg-gold text-black'
                      : step > s
                        ? 'bg-white/10 text-white'
                        : 'bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  {step > s ? '✓' : s}
                </span>
                <span className="hidden xl:inline text-zinc-400">{labels[s]}</span>
              </div>
              {i < lastShown - 1 && (
                <div className={`w-6 h-px ${step > s ? 'bg-gold/30' : 'bg-white/[0.06]'}`} />
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingDesktopProgress;
