import { memo, type FC, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { CalendarPlus, CalendarClock, ChevronRight, Scissors, Clock, MapPin } from 'lucide-react';
import { getClientSession } from '../../lib/clientSession';
import { useIsDesktop } from '../../hooks/useIsDesktop';

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
    className={`group relative w-full flex items-center justify-between gap-4 sm:gap-6 px-6 sm:px-7 py-5 sm:py-6 rounded-2xl transition-all duration-300 cursor-pointer text-left overflow-hidden ${
      primary
        ? 'card-gold text-[#1a1206] hover:-translate-y-1 active:scale-[0.99]'
        : 'orbit-border text-white shadow-[0_10px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_14px_48px_rgba(212,175,55,0.22)] hover:-translate-y-1 active:scale-[0.99]'
    }`}
  >
    {/* Faixa de brilho metálico no card primário */}
    {primary && <span className="gold-sheen" aria-hidden />}

    {/* Ícone em losango (diamante) */}
    <div className="relative z-10 flex items-center gap-4 sm:gap-5 min-w-0">
      <div className="icon-diamond w-12 h-12 sm:w-14 sm:h-14 shrink-0">
        <span className="icon-diamond__gem" aria-hidden />
        <span className="icon-diamond__content">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-base sm:text-lg font-extrabold tracking-tight transition-colors duration-300 ${
              primary ? 'text-[#1a1206]' : 'text-white group-hover:text-gold-bright'
            }`}
          >
            {title}
          </p>
        </div>
        <p
          className={`text-xs sm:text-sm font-medium transition-colors duration-300 mt-0.5 line-clamp-2 leading-snug ${
            primary ? 'text-[#3a2c08]/90' : 'text-zinc-400 group-hover:text-zinc-300'
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>

    <div
      className={`relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
        primary
          ? 'bg-black/15 group-hover:bg-black/25 text-[#1a1206] border border-black/10'
          : 'bg-white/5 border border-white/10 group-hover:border-gold/40 text-zinc-400 group-hover:text-gold-bright'
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

/** Marca orbital — logo com anéis + badge. Reutilizada em desktop e mobile. */
const BrandLogo: FC = memo(() => (
  <div className="relative group">
    <div className="absolute inset-[-24px] rounded-full bg-gold/15 blur-3xl group-hover:bg-gold/25 transition-all duration-500" />
    <div className="logo-ring-outer" aria-hidden />
    <div className="logo-ring" aria-hidden />
    <img
      src="/assets/logo.webp"
      alt="Black Diamond"
      loading="eager"
      decoding="async"
      className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain relative drop-shadow-[0_10px_30px_rgba(0,0,0,0.85)] transition-transform duration-500 group-hover:scale-105"
    />
  </div>
));
BrandLogo.displayName = 'BrandLogo';

const BookingPreScreenMenu: FC = memo(() => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const session = getClientSession();
  const firstName = session?.name?.split(' ')[0];
  const greeting = firstName
    ? `Que bom te ver de novo, ${firstName}! 💈`
    : 'Agende seu horário em segundos';

  const handleBookNow = () => {
    navigate(
      '/agendar',
      session ? { state: { name: session.name, phone: session.phone } } : undefined
    );
  };

  /* ─────────────────────────────────────────────────────────────
     DESKTOP (lg+) — split-screen dedicado: identidade à esquerda,
     painel de ações à direita. Composição pensada pra tela grande.
     ───────────────────────────────────────────────────────────── */
  if (isDesktop) {
    return (
      <div className="w-full max-w-6xl mx-auto grid grid-cols-2 gap-10 xl:gap-16 items-center">
        {/* LEFT — Identidade */}
        <div className="text-left">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex justify-center lg:justify-start mb-10"
          >
            <BrandLogo />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-gold/40 bg-gold/[0.08] backdrop-blur-md mb-6 shadow-lg shadow-gold/10">
              <span className="pulse-dot shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-gold-bright">
                Agendamento online
              </span>
            </div>

            <h1 className="font-black text-white tracking-tight leading-[0.95]">
              <span className="block tracking-[0.18em] drop-shadow-md text-zinc-100 text-5xl xl:text-6xl">
                BLACK
              </span>
              <span className="block gold-engraved font-cinzel tracking-[0.14em] pt-3 pb-3 text-6xl xl:text-7xl">
                DIAMOND
              </span>
            </h1>

            <p className="text-lg xl:text-xl text-zinc-300 font-medium mt-4 max-w-md">{greeting}</p>

            {/* Detalhes da barbearia — somente desktop */}
            <div className="mt-10 space-y-3.5">
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                  <Scissors size={14} className="text-gold-bright" />
                </span>
                <span className="text-sm font-medium">
                  Corte na régua, barba na régua, papo reto
                </span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-gold-bright" />
                </span>
                <span className="text-sm font-medium">Seg–Sáb · 08h às 18h</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-gold-bright" />
                </span>
                <span className="text-sm font-medium">Av. Brasílio da Gama, 139 — BH</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT — Painel de ações */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="orbit-border relative rounded-3xl p-8 xl:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            {/* Cantoneiras ornamentais */}
            <span className="corner-ornament corner-ornament--tl" aria-hidden />
            <span className="corner-ornament corner-ornament--br" aria-hidden />

            <div className="mb-8">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold-bright mb-2">
                Como podemos ajudar?
              </p>
              <h2 className="text-2xl xl:text-3xl font-black text-white tracking-tight">
                Escolha uma opção
              </h2>
              <div className="ornament-divider mt-5 justify-start">
                <span className="ornament-divider__line w-12" />
                <span className="ornament-divider__gem" />
              </div>
            </div>

            <div className="space-y-4">
              <MenuOption
                primary
                icon={<CalendarPlus size={22} className="text-[#1a1206]" />}
                title="Agendar agora"
                subtitle="Escolha o serviço, o dia e o horário"
                onClick={handleBookNow}
              />

              <MenuOption
                icon={<CalendarClock size={22} className="text-gold-bright" />}
                title="Entrar"
                subtitle="Seus agendamentos ou o painel administrativo"
                onClick={() => navigate('/entrar')}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     MOBILE / TABLET (< lg) — coluna centralizada (layout aprovado)
     ───────────────────────────────────────────────────────────── */
  return (
    <div className="w-full max-w-lg mx-auto sm:max-w-xl">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center mb-8 sm:mb-10"
        >
          <BrandLogo />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-gold/40 bg-gold/[0.08] backdrop-blur-md mb-7 shadow-lg shadow-gold/10">
            <span className="pulse-dot shrink-0" aria-hidden />
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-gold-bright">
              Agendamento online
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            <span className="block tracking-[0.32em] drop-shadow-md text-zinc-100">BLACK</span>
            <span className="block gold-engraved font-cinzel tracking-[0.22em] pt-2 pb-2">
              DIAMOND
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-base sm:text-lg text-zinc-300 font-medium mt-2 sm:mt-3"
        >
          {greeting}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.6 }}
          className="ornament-divider mt-6 sm:mt-7"
          aria-hidden
        >
          <span className="ornament-divider__line" />
          <span className="ornament-divider__gem" />
          <span className="ornament-divider__line ornament-divider__line--r" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="space-y-4 sm:space-y-5 mt-8 sm:mt-10"
      >
        <MenuOption
          primary
          icon={<CalendarPlus size={22} className="text-[#1a1206]" />}
          title="Agendar agora"
          subtitle="Escolha o serviço, o dia e o horário"
          onClick={handleBookNow}
        />

        <MenuOption
          icon={<CalendarClock size={22} className="text-gold-bright" />}
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
