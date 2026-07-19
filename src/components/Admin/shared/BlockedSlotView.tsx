import { type FC } from 'react';
import { LockIcon, UnlockIcon } from './PanelIcons';

interface BlockedSlotViewProps {
  onUnblock: () => void;
  onClose: () => void;
}

const BlockedSlotView: FC<BlockedSlotViewProps> = ({ onUnblock, onClose }) => {
  return (
    <>
      <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-5 lg:px-6 py-3.5 lg:py-4 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em]">
          Horário Bloqueado
        </span>
      </div>
      <div className="px-5 lg:px-6 py-5 lg:py-6 flex-1 text-left overflow-y-auto scrollbar-hide">
        {/* Mobile: minimal */}
        <div className="lg:hidden space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#D4AF37]/10">
              <LockIcon />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-white">Horário Bloqueado</h3>
              <p className="text-[11px] text-zinc-500">Não aceita agendamentos</p>
            </div>
          </div>
          <button
            onClick={() => {
              onUnblock();
              onClose();
            }}
            className="w-full h-10 bg-[#D4AF37]/10 text-[#D4AF37] font-bold text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer rounded-xl"
          >
            Desbloquear
          </button>
        </div>
        {/* Desktop: with cards */}
        <div className="hidden lg:block space-y-6">
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl">
            <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center shrink-0">
              <LockIcon width={20} height={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Horário Indisponível</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Este horário foi bloqueado e não aceita agendamentos.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onUnblock();
              onClose();
            }}
            className="w-full h-11 bg-[#D4AF37]/10 border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-black text-[10px] uppercase tracking-[0.25em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
          >
            <UnlockIcon />
            Desbloquear Horário
          </button>
        </div>
      </div>
    </>
  );
};

export default BlockedSlotView;
