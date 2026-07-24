import { type FC } from 'react';
import { User, type LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
}

interface ProfileMobileProps {
  greeting: string;
  barberName: string;
  barberPhoto?: string;
  quickActions: QuickAction[];
}

const ProfileMobile: FC<ProfileMobileProps> = ({
  greeting,
  barberName,
  barberPhoto,
  quickActions,
}) => {
  return (
    <div className="lg:hidden w-full max-w-md mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-[#161616] border-b border-white/5 px-6 pt-6 pb-8 -mt-4 text-white flex flex-col gap-6 relative overflow-hidden shadow-lg shadow-black/40">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-white/[0.08] overflow-hidden shrink-0 bg-white/[0.03]">
            {barberPhoto ? (
              <img src={barberPhoto} alt={barberName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={18} className="text-zinc-600" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {greeting}, {barberName}
            </h1>
            <p className="text-[11px] text-zinc-500">Acesse os relatórios para ver seus números</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-5">
          Ações Rápidas
        </span>
        <div className="flex gap-4 overflow-x-auto pb-2 px-5 scrollbar-hide snap-x w-full">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            const isActive = 'active' in action ? action.active : false;
            const isHighlight = action.highlight;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex flex-col items-center gap-2 snap-center cursor-pointer shrink-0 group select-none"
              >
                <div
                  className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                    isHighlight
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] shadow-[0_0_12px_rgba(197,160,89,0.15)]'
                      : isActive
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
                        : 'bg-[#111111] hover:bg-[#161616] border-white/5 group-hover:border-[#D4AF37]/30 text-zinc-400 group-hover:text-white'
                  }`}
                >
                  <Icon size={18} className="transition-transform group-hover:scale-110" />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isHighlight ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                >
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProfileMobile;
