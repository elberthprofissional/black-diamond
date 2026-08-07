import { type CSSProperties, type FC } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import BookingPreScreenMenu from './BookingPreScreenMenu';

/**
 * Partículas de brasa — valores determinísticos para render estável.
 * Cada partícula sobe do rodapé com deriva lateral e fade out (CSS .ember).
 */
const EMBERS: Array<{
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: string;
}> = [
  { left: '4%', size: 3, duration: 12, delay: 0, opacity: 0.6, drift: '48px' },
  { left: '11%', size: 2, duration: 9, delay: 2.2, opacity: 0.4, drift: '-30px' },
  { left: '18%', size: 4, duration: 14, delay: 1.1, opacity: 0.5, drift: '60px' },
  { left: '26%', size: 2, duration: 10, delay: 4.5, opacity: 0.35, drift: '-20px' },
  { left: '33%', size: 3, duration: 13, delay: 0.6, opacity: 0.45, drift: '36px' },
  { left: '41%', size: 2, duration: 8.5, delay: 3.1, opacity: 0.35, drift: '-42px' },
  { left: '49%', size: 3, duration: 11.5, delay: 5.2, opacity: 0.55, drift: '24px' },
  { left: '56%', size: 2, duration: 9.5, delay: 1.8, opacity: 0.4, drift: '-34px' },
  { left: '63%', size: 4, duration: 15, delay: 3.7, opacity: 0.5, drift: '52px' },
  { left: '71%', size: 2, duration: 10.5, delay: 0.2, opacity: 0.35, drift: '-26px' },
  { left: '78%', size: 3, duration: 12.5, delay: 2.9, opacity: 0.55, drift: '40px' },
  { left: '85%', size: 2, duration: 8, delay: 4.1, opacity: 0.4, drift: '-38px' },
  { left: '92%', size: 3, duration: 13.5, delay: 1.4, opacity: 0.5, drift: '30px' },
  { left: '97%', size: 2, duration: 9, delay: 3.4, opacity: 0.35, drift: '-22px' },
];

/**
 * Tela de entrada do agendamento — Visual Redesenhado Premium v4.0.
 */
const BookingPreScreen: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden selection:bg-gold/30 selection:text-gold-bright">
      {/* Ambient Background & Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        {/* Deep Dark Base */}
        <div className="absolute inset-0 bg-radial from-[#120d06] via-[#080808] to-[#030303]" />

        {/* Central Gold Spotlight Effect */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[500px] sm:h-[650px] rounded-full bg-gradient-to-b from-gold/15 via-gold/5 to-transparent blur-[130px] opacity-80"
          style={{ animation: 'spotlight-drift 18s ease-in-out infinite' }}
        />

        {/* Dynamic Glow Orbs */}
        <div className="absolute top-[35%] -left-40 w-[450px] h-[450px] rounded-full bg-[#8B6914]/10 blur-[130px] animate-pulse" />
        <div className="absolute bottom-[10%] -right-40 w-[500px] h-[500px] rounded-full bg-gold/10 blur-[140px]" />

        {/* Subtle Luxury Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #d4af37 1px, transparent 1px), linear-gradient(to bottom, #d4af37 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Vignette Layer for Focus */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Animated Gold Embers */}
        {EMBERS.map((ember, i) => (
          <span
            key={i}
            className="ember"
            style={
              {
                left: ember.left,
                width: ember.size,
                height: ember.size,
                animationDuration: `${ember.duration}s`,
                animationDelay: `${ember.delay}s`,
                '--ember-drift': ember.drift,
                '--ember-opacity': ember.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 px-6 pt-6 pb-2 max-w-7xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar"
          className="group flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md text-zinc-400 hover:text-white hover:border-gold/40 hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-gold/10 active:scale-95"
        >
          <ArrowLeft
            size={16}
            className="transition-transform duration-300 group-hover:-translate-x-1"
          />
          <span className="text-xs font-semibold tracking-wider uppercase hidden sm:inline">
            Voltar
          </span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <BookingPreScreenMenu />
      </main>

      {/* Modern Glass Footer */}
      <footer className="relative z-20 border-t border-white/5 bg-black/40 backdrop-blur-md py-3 px-6">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <p className="text-[9px] text-zinc-500 tracking-[0.25em] uppercase font-bold">
            Black Diamond Barbearia
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="group flex items-center gap-1.5 text-[9px] text-zinc-500 hover:text-gold transition-colors duration-300 uppercase tracking-[0.2em] font-semibold cursor-pointer"
          >
            <Lock
              size={10}
              className="shrink-0 text-zinc-600 group-hover:text-gold transition-colors duration-300"
            />
            <span>Admin</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default BookingPreScreen;
