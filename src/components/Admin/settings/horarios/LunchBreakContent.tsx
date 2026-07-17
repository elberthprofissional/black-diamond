import { type FC } from 'react';
import { motion } from 'framer-motion';
import { DAY_NAMES, DAYS_ORDER, type HoursData, type LunchBreak } from './types';
import TimePickerSheet from './TimePickerSheet';

/**
 * Conteudo do configurador de intervalo de almoco.
 * Usado tanto no modal desktop quanto na sheet mobile.
 * Cada plataforma fornece seu proprio container (modal/sheet).
 */
interface LunchBreakContentProps {
  hours: HoursData;
  onChange: (hours: HoursData) => void;
  onHasChange: () => void;
  layout: 'desktop' | 'mobile';
}

const LunchBreakContent: FC<LunchBreakContentProps> = ({
  hours,
  onChange,
  onHasChange,
  layout,
}) => {
  const lunch = hours.lunch_break;

  const toggleLunch = () => {
    if (lunch) {
      // Desativar: remove lunch_break do objeto
      const next = { ...hours };
      delete next.lunch_break;
      onChange(next);
    } else {
      // Ativar: cria com valores padrao
      onChange({
        ...hours,
        lunch_break: {
          enabled: true,
          start: '12:00',
          end: '13:00',
          days: [1, 2, 3, 4, 5],
        },
      });
    }
    onHasChange();
  };

  const updateLunch = (patch: Partial<LunchBreak>) => {
    if (!hours.lunch_break) return;
    onChange({ ...hours, lunch_break: { ...hours.lunch_break, ...patch } });
    onHasChange();
  };

  const isSm = layout === 'mobile';

  return (
    <>
      {/* Toggle */}
      <div>
        <div className={`flex items-center justify-between ${isSm ? 'mb-2' : ''}`}>
          <span className={`${isSm ? 'text-[15px]' : 'text-[13px]'} text-white font-medium`}>
            Ativar intervalo
          </span>
          <button
            onClick={toggleLunch}
            role="switch"
            aria-checked={!!lunch}
            className={`relative ${isSm ? 'w-11 h-6' : 'w-10 h-[22px]'} rounded-full transition-colors cursor-pointer ${lunch ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}
          >
            <motion.div
              className={`absolute ${isSm ? 'top-0.5 w-5 h-5' : 'top-[3px] w-4 h-4'} bg-white rounded-full shadow-sm`}
              animate={{ left: lunch ? (isSm ? 22 : 20) : isSm ? 2 : 3 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
        <p className={`${isSm ? 'text-[12px]' : 'text-[11px]'} text-zinc-500 mt-1.5`}>
          As notificações serão silenciadas durante esse período.
        </p>
      </div>

      {/* Time pickers + Days */}
      {lunch && (
        <div className="border-t border-white/[0.04] pt-4 space-y-4">
          <div>
            {isSm && (
              <span className="text-[12px] text-zinc-400 font-medium block mb-3">Horário</span>
            )}
            <div className="flex items-center justify-center gap-3">
              <TimePickerSheet
                value={lunch.start}
                onChange={(v) => updateLunch({ start: v })}
                label="Início"
              />
              <span className={`${isSm ? 'text-[13px]' : 'text-[12px]'} text-zinc-500`}>às</span>
              <TimePickerSheet
                value={lunch.end}
                onChange={(v) => updateLunch({ end: v })}
                label="Fim"
              />
            </div>
          </div>

          <div>
            {isSm && (
              <span className="text-[12px] text-zinc-400 font-medium block mb-3">
                Dias da semana
              </span>
            )}
            <div className="flex gap-1.5 sm:gap-2">
              {DAYS_ORDER.map((d) => {
                const isActive = lunch.days.includes(Number(d));
                return (
                  <button
                    key={d}
                    onClick={() => {
                      const dayNum = Number(d);
                      const newDays = isActive
                        ? lunch.days.filter((x) => x !== dayNum)
                        : [...lunch.days, dayNum].sort((a, b) => a - b);
                      updateLunch({ days: newDays });
                    }}
                    className={`flex-1 py-2.5 ${isSm ? 'py-3.5 rounded-xl border' : 'rounded-lg'} text-[10px] ${isSm ? 'text-[11px]' : ''} font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
                    }`}
                  >
                    {DAY_NAMES[d]?.slice(0, 3).toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LunchBreakContent;
