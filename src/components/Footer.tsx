import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
// Instagram icon replaced with inline SVG (lucide-react v1 removed brand icons)
const InstagramIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="md:w-4 md:h-4"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import { useBarberSettings } from '../hooks/useBarberSettings';
import { formatPhone } from '../lib/utils';
import { WhatsAppIcon } from './WhatsAppIcon';

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

interface HoursData {
  [key: string]: DaySchedule;
}

const Footer: FC = () => {
  const { barberPhone, barberInstagram, barberHours } = useBarberSettings();

  const hours: HoursData | null = useMemo(() => {
    if (!barberHours) return null;
    try {
      return JSON.parse(barberHours);
    } catch {
      return null;
    }
  }, [barberHours]);

  const segSex = hours?.['1']?.enabled ? `${hours['1'].open} - ${hours['1'].close}` : null;
  const sabado = hours?.['6']?.enabled ? `${hours['6'].open} - ${hours['6'].close}` : null;
  const domingo = hours?.['0']?.enabled ? `${hours['0'].open} - ${hours['0'].close}` : null;

  return (
    <footer className="bg-[#0A0A0A] pt-16 pb-8 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      <div className="container mx-auto px-6 relative z-10">
        {/* Footer Top Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-12 md:mb-16">
          {/* Brand Column */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src="/assets/logo.webp"
                alt="Black Diamond"
                className="w-10 h-10 md:w-16 md:h-16 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              />
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bebas tracking-widest text-[#D4AF37]">
                  BLACK DIAMOND
                </span>
              </div>
            </div>
          </div>

          {/* Social & Contact Column (2nd) */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-white font-bebas text-base md:text-lg tracking-widest uppercase">
              Contatos
            </h4>
            <div className="space-y-3 md:space-y-4">
              {/* Instagram */}
              {barberInstagram && (
                <a
                  href={`https://www.instagram.com/${barberInstagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Acessar nosso perfil no Instagram"
                  className="group flex items-center gap-3 md:gap-4 text-zinc-400 hover:text-[#D4AF37] transition-all duration-500"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/10 transition-all duration-500">
                    <InstagramIcon />
                  </div>
                  <span className="font-roboto font-light text-xs md:text-sm">
                    Siga a gente no Instagram
                  </span>
                </a>
              )}

              {/* WhatsApp */}
              {barberPhone && (
                <a
                  href={`https://wa.me/${barberPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Entrar em contato via WhatsApp no número ${formatPhone(barberPhone)}`}
                  className="group flex items-center gap-3 md:gap-4 text-zinc-400 hover:text-[#D4AF37] transition-all duration-500"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/10 transition-all duration-500">
                    <WhatsAppIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-current" />
                  </div>
                  <span className="font-roboto font-light text-xs md:text-sm group-hover:text-[#D4AF37] transition-colors">
                    Me chame no WhatsApp
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Hours Section (3rd) */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-white font-bebas text-base md:text-lg tracking-widest uppercase">
              Horário de Funcionamento
            </h4>
            <div className="space-y-2">
              {segSex && (
                <div className="flex flex-col">
                  <span className="text-[#D4AF37] font-bebas text-[12px] md:text-sm tracking-wider uppercase">
                    Seg - Sex
                  </span>
                  <span className="text-zinc-400 font-roboto font-light text-xs md:text-sm">
                    {segSex}
                  </span>
                </div>
              )}
              {sabado && (
                <div className="flex flex-col">
                  <span className="text-[#D4AF37] font-bebas text-[12px] md:text-sm tracking-wider uppercase">
                    Sábado
                  </span>
                  <span className="text-zinc-400 font-roboto font-light text-xs md:text-sm">
                    {sabado}
                  </span>
                </div>
              )}
              {domingo && (
                <div className="flex flex-col">
                  <span className="text-[#D4AF37] font-bebas text-[12px] md:text-sm tracking-wider uppercase">
                    Domingo
                  </span>
                  <span className="text-zinc-400 font-roboto font-light text-xs md:text-sm">
                    {domingo}
                  </span>
                </div>
              )}
              {!segSex && !sabado && !domingo && (
                <span className="text-zinc-500 font-roboto font-light text-xs md:text-sm">
                  Consulte nossos horários
                </span>
              )}
            </div>
          </div>

          {/* Address Column (4th) */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-white font-bebas text-base md:text-lg tracking-widest uppercase">
              Localização
            </h4>
            <div className="flex items-start gap-3 md:gap-4 text-zinc-400">
              <div className="shrink-0 mt-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 md:w-4 md:h-4 fill-[#D4AF37]">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <p className="font-roboto font-light text-xs md:text-sm leading-relaxed">
                Av. Brasílio da Gama, 139, Tupi, Belo Horizonte
              </p>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col items-center gap-3">
          <p className="text-[9px] md:text-[10px] font-roboto font-light text-zinc-500 uppercase tracking-[0.4em] text-center">
            © 2026 Black Diamond — Todos os direitos reservados.
          </p>

          <a
            href={`https://wa.me/${barberPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] md:text-[9px] font-roboto font-light text-zinc-600 hover:text-zinc-400 uppercase tracking-[0.3em] transition-colors"
            aria-label="Criado por Elberth Mayan"
          >
            Criado por Elberth Mayan
          </a>

          <Link
            to="/admin"
            aria-label="Acesso restrito para administradores"
            className="group flex items-center gap-3 px-4 py-2 bg-[#141414] border border-white/5 rounded-full hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-500 mt-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
            <span className="text-[10px] font-bebas uppercase tracking-[0.1em] text-zinc-400 group-hover:text-[#D4AF37] transition-colors">
              Acesso Restrito
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
