import { type FC } from 'react';
import { User, Scissors, Tag, Calendar, Clock, Sparkles } from 'lucide-react';

interface QuickNavProps {
  onBookingClick: () => void;
}

const QuickNav: FC<QuickNavProps> = ({ onBookingClick }) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementPosition = el.getBoundingClientRect().top - bodyRect;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  const navItems = [
    {
      icon: User,
      label: 'SOBRE',
      action: () => scrollToSection('sobre'),
    },
    {
      icon: Scissors,
      label: 'TRABALHOS',
      action: () => scrollToSection('galeria'),
    },
    {
      icon: Tag,
      label: 'VALORES',
      action: () => scrollToSection('servicos'),
    },
    {
      icon: Calendar,
      label: 'AGENDAR',
      action: onBookingClick,
      highlight: true,
    },
    {
      icon: Clock,
      label: 'HORÁRIOS',
      action: () => scrollToSection('localizacao'),
    },
  ];

  return (
    <section className="py-8 sm:py-12 bg-[#161616] border-y border-white/[0.06] text-white">
      <div className="container mx-auto px-4 max-w-5xl text-center">
        {/* Subtitle Header */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          <Sparkles size={12} className="text-zinc-500" />
          <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-400">
            O QUE VOCÊ PROCURA HOJE?
          </span>
          <Sparkles size={12} className="text-zinc-500" />
        </div>

        {/* 5 Icons Row - Fitted cleanly on all screen sizes */}
        <div className="grid grid-cols-5 gap-1 sm:gap-4 justify-items-center max-w-2xl mx-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="group flex flex-col items-center gap-2 transition-transform duration-300 hover:-translate-y-1 cursor-pointer bg-transparent border-0 p-1 w-full"
              >
                <div
                  className={`w-11 h-11 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    item.highlight
                      ? 'bg-white text-black border-white shadow-lg group-hover:bg-[#e0e0e0]'
                      : 'bg-[#202020] text-zinc-300 border-white/10 group-hover:border-white/40 group-hover:text-white group-hover:bg-[#282828]'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} className="sm:w-6 sm:h-6" />
                </div>
                <span className="text-[8px] sm:text-[10px] md:text-[11px] font-sans font-bold uppercase tracking-[0.1em] text-zinc-400 group-hover:text-white transition-colors text-center truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickNav;
