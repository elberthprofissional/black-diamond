import { memo, type FC } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Check, MessageCircle } from 'lucide-react';
import type { Barber } from '../../types';

interface BarberStepProps {
  barbers: Barber[];
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
}

/**
 * Etapa de seleção do barbeiro no agendamento público (multi-barbeiro).
 * O cliente escolhe com quem quer cortar — o WhatsApp e a notificação
 * do agendamento vão para o barbeiro escolhido.
 */
const BarberStep: FC<BarberStepProps> = memo(({ barbers, selectedBarber, onSelectBarber }) => {
  if (barbers.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Scissors size={28} className="mx-auto text-zinc-600" />
        <p className="text-[14px] text-zinc-500">Nenhum barbeiro disponível no momento.</p>
        <p className="text-[12px] text-zinc-600">
          Volte mais tarde ou fale com a barbearia pelo WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Escolha o barbeiro
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500">
          O agendamento e a confirmação vão direto para o barbeiro escolhido.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {barbers.map((barber, index) => {
          const isSelected = selectedBarber?.id === barber.id;
          return (
            <motion.button
              key={barber.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              onClick={() => onSelectBarber(barber)}
              aria-pressed={isSelected}
              className={`group relative w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-gold/60 bg-gold/[0.07] shadow-[0_0_30px_rgba(212,175,55,0.15)]'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]'
              }`}
            >
              {/* Check badge */}
              <div
                className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isSelected
                    ? 'bg-gold text-black scale-100'
                    : 'bg-white/[0.06] text-transparent scale-90'
                }`}
              >
                <Check size={13} strokeWidth={3} />
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border flex items-center justify-center transition-all duration-300 ${
                    isSelected
                      ? 'border-gold/50'
                      : 'border-white/[0.08] group-hover:border-white/20'
                  }`}
                >
                  {barber.photo_url ? (
                    <img
                      src={barber.photo_url}
                      alt={`Foto de ${barber.name}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Scissors size={22} className="text-gold/80" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] sm:text-base font-bold text-white tracking-tight truncate">
                    {barber.name}
                  </p>
                  {barber.bio ? (
                    <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 leading-snug line-clamp-2">
                      {barber.bio}
                    </p>
                  ) : barber.phone ? (
                    <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                      <MessageCircle size={11} className="text-gold/70" />
                      WhatsApp disponível
                    </p>
                  ) : null}
                </div>
              </div>

              {barber.quote && isSelected && (
                <p className="mt-3 pt-3 border-t border-gold/15 text-[11px] font-serif italic text-gold/80 leading-snug">
                  &ldquo;{barber.quote}&rdquo;
                </p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

BarberStep.displayName = 'BarberStep';

export default BarberStep;
