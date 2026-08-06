import { memo, type FC, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarClock, ChevronRight } from 'lucide-react';
import { getClientSession } from '../../lib/clientSession';

interface MenuOptionProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary?: boolean;
}

const MenuOption: FC<MenuOptionProps> = memo(({ icon, title, subtitle, onClick, primary }) => (
  <button
    onClick={onClick}
    className={`menu-card-shine group relative w-full flex items-center justify-between gap-4 sm:gap-6 px-6 sm:px-7 py-5 sm:py-6 rounded-2xl transition-all duration-300 cursor-pointer text-left overflow-hidden ${
      primary
        ? 'bg-gradient-to-r from-[#F7E28B] via-gold to-[#B8902A] text-zinc-950 shadow-[0_8px_32px_rgba(212,175,55,0.25)] hover:shadow-[0_16px_48px_rgba(212,175,55,0.45)] hover:-translate-y-1 active:scale-[0.99] border border-amber-200/50'
        : 'bg-zinc-950/70 backdrop-blur-xl border border-white/10 hover:border-gold/50 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.2)] hover:-translate-y-1 active:scale-[0.99]'
    }`}
  >
    {/* Subtle Glow Overlay on Hover */}
    <span
      className={`absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none ${
        primary
          ? 'bg-gradient-to-r from-white/20 via-transparent to-black/10'
          : 'bg-gradient-to-r from-gold/10 via-gold/5 to-transparent'
      }`}
    />

    <div className="relative z-10 flex items-center gap-4 sm:gap-5 min-w-0">
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm ${
          primary
            ? 'bg-zinc-950/90 text-gold border border-gold/40'
            : 'bg-gold/10 border border-gold/30 text-gold group-hover:bg-gold/20 group-hover:border-gold/60'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-base sm:text-lg font-extrabold tracking-tight transition-colors duration-300 ${
              primary ? 'text-zinc-950' : 'text-white group-hover:text-gold'
            }`}
          >
            {title}
          </p>
        </div>
        <p
          className={`text-xs sm:text-sm font-medium transition-colors duration-300 mt-0.5 truncate ${
            primary ? 'text-zinc-900/80' : 'text-zinc-400 group-hover:text-zinc-300'
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>

    <div
      className={`relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
        primary
          ? 'bg-zinc-950/10 group-hover:bg-zinc-950/20 text-zinc-950'
          : 'bg-white/5 border border-white/10 group-hover:border-gold/40 text-zinc-400 group-hover:text-gold'
      }`}
    >
      <ChevronRight
        size={20}
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </div>
  </button>
));
MenuOption.displayName = 'MenuOption';

const BookingPreScreenMenu: FC = memo(() => {
  const navigate = useNavigate();
  const session = getClientSession();
  const firstName = session?.name?.split(' ')[0];

  const handleBookNow = () => {
    // Pré-preenche nome/telefone no wizard quando já conhecemos o cliente
    navigate(
      '/agendar',
      session ? { state: { name: session.name, phone: session.phone } } : undefined
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto sm:max-w-xl lg:max-w-2xl">
      <div className="text-center">
        {/* Brand Logo Presentation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center mb-6 sm:mb-8"
        >
          <div className="relative group">
            {/* Glowing Aura Background */}
            <div className="absolute inset-[-24px] rounded-full bg-gold/15 blur-3xl group-hover:bg-gold/25 transition-all duration-500" />
            <div className="logo-ring" aria-hidden />
            <img
              src="/assets/logo.webp"
              alt="Black Diamond"
              loading="eager"
              decoding="async"
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain relative drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </motion.div>

        {/* Title & Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 backdrop-blur-md mb-6 shadow-lg shadow-gold/5">
            <span className="pulse-dot shrink-0" aria-hidden />
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-gold-bright">
              Agendamento online
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
            <span className="block tracking-wider drop-shadow-md text-zinc-100">BLACK</span>
            <span className="block gold-shimmer-text font-cinzel tracking-widest pt-1 pb-2 drop-shadow-[0_4px_20px_rgba(212,175,55,0.35)]">
              DIAMOND
            </span>
          </h1>
        </motion.div>

        {/* Greeting or Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-base sm:text-lg text-zinc-300 font-medium mt-2 sm:mt-3"
        >
          {firstName
            ? `Que bom te ver de novo, ${firstName}! 💈`
            : 'Agende seu horário em segundos'}
        </motion.p>

        {/* Decorative Gold Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.28, duration: 0.6 }}
          className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto mt-5 sm:mt-6 origin-center rounded-full"
        />
      </div>

      {/* Main Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="space-y-4 sm:space-y-5 mt-8 sm:mt-10"
      >
        <MenuOption
          primary
          icon={<CalendarPlus size={22} className="text-gold" />}
          title="Agendar agora"
          subtitle="Escolha o serviço, o dia e o horário"
          onClick={handleBookNow}
        />

        <MenuOption
          icon={<CalendarClock size={22} className="text-gold" />}
          title="Entrar"
          subtitle="Seus agendamentos ou o painel administrativo"
          onClick={() => navigate('/entrar')}
        />
      </motion.div>
    </div>
  );
});
BookingPreScreenMenu.displayName = 'BookingPreScreenMenu';

export default BookingPreScreenMenu;
