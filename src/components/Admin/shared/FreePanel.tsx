import { memo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

interface FreePanelProps {
  freeSlots: string[];
  selectedDate: string;
  blockingSlot: string | null;
  blockingDay: boolean;
  onBlockSlot: (slot: string) => void;
  onBlockDay: () => void;
}

const FreePanel: FC<FreePanelProps> = ({
  freeSlots,
  selectedDate,
  blockingSlot,
  blockingDay,
  onBlockSlot,
  onBlockDay,
}) => {
  const navigate = useNavigate();

  if (freeSlots.length === 0) {
    return (
      <p className="text-zinc-600 text-[10px] uppercase tracking-widest text-center py-8">
        Nenhum horário livre
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onBlockDay}
        disabled={blockingDay}
        className="group w-full mb-4 py-3.5 px-4 bg-white/[0.02] hover:bg-red-500/[0.06] border border-white/[0.06] hover:border-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {blockingDay ? (
          <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        Bloquear Dia Inteiro
      </button>
      {freeSlots.map((slot) => (
        <div
          key={`free-${slot}`}
          className="flex items-center bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3"
        >
          <span className="text-sm font-black text-gold tabular-nums w-12 shrink-0">{slot}</span>
          <div className="w-px h-4 bg-white/[0.08] mx-3 shrink-0" />
          <div className="flex-1 flex items-center justify-end gap-6">
            <button
              onClick={() => onBlockSlot(slot)}
              disabled={blockingSlot === slot}
              aria-label={`Bloquear horario ${slot}`}
              className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400/60 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              {blockingSlot === slot ? '...' : 'Bloquear'}
            </button>
            <button
              onClick={() =>
                navigate('/admin/agendar', { state: { date: selectedDate, time: slot } })
              }
              aria-label={`Agendar no horario ${slot}`}
              className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 hover:text-gold transition-colors cursor-pointer"
            >
              Agendar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(FreePanel);
