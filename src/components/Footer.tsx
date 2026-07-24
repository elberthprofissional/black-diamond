import { useMemo, type FC } from 'react';
import { Phone, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBarberSettings } from '../contexts/BarberSettingsContext';
import { formatPhone } from '../lib/utils';
import { WhatsAppIcon } from './WhatsAppIcon';
import { logError } from '../lib/logger';

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

interface HoursData {
  [key: string]: DaySchedule;
}

const Footer: FC = () => {
  const { barberPhone, barberInstagram, barberHours, brandName, brandColor, brandLogo } =
    useBarberSettings();
  const displayName = brandName || 'BLACK DIAMOND';

  const hasPhone = barberPhone && !/^0+$/.test(barberPhone) && barberPhone !== '5500000000000';

  const hours: HoursData | null = useMemo(() => {
    if (!barberHours) return null;
    try {
      return JSON.parse(barberHours);
    } catch (e) {
      logError(e);
      return null;
    }
  }, [barberHours]);

  const segSex =
    hours?.['1']?.enabled && hours['1']?.open && hours['1']?.close
      ? `${hours['1'].open} às ${hours['1'].close}`
      : null;
  const sabado =
    hours?.['6']?.enabled && hours['6']?.open && hours['6']?.close
      ? `${hours['6'].open} às ${hours['6'].close}`
      : null;

  return (
    <footer className="bg-[#0A0A0A] pt-12 pb-8 overflow-hidden relative">
      <div
        className="absolute top-0 left-0 w-full h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${brandColor}33, transparent)`,
        }}
      />
      <div className="container mx-auto px-6 relative z-10">
        {/* ========== MOBILE: Layout Centralizado ========== */}
        <div className="md:hidden flex flex-col items-center text-center space-y-8">
          {/* Logo Centralizado */}
          <img
            src={brandLogo || '/assets/logo.webp'}
            alt={displayName}
            className="w-24 h-24 object-contain"
          />

          {/* Frase */}
          <p className="text-zinc-500 font-light text-xs leading-relaxed max-w-xs">
            Sua imagem é poder, recupere o seu.
          </p>

          {/* Localização */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide">Localização</h4>
            <div className="space-y-4">
              <div className="flex flex-col items-center text-zinc-400">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#D4AF37] mb-2" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <p className="font-light text-sm leading-relaxed text-center">
                  Av. Brasílio da Gama, 139
                  <br />
                  Bairro Tupi, BH
                </p>
              </div>
              {segSex && (
                <div className="flex flex-col items-center text-zinc-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 fill-[#D4AF37] mb-2"
                    aria-hidden="true"
                  >
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                  <p className="font-light text-sm text-center">
                    <span className="text-[#D4AF37]">Seg - Sáb:</span> {segSex}
                  </p>
                </div>
              )}
              {sabado && segSex !== `${sabado}` && (
                <div className="flex flex-col items-center text-zinc-400">
                  <div className="w-5 h-5 mb-2" />
                  <p className="font-light text-sm text-center">
                    <span className="text-[#D4AF37]">Sábado:</span> {sabado}
                  </p>
                </div>
              )}
              {hasPhone && (
                <div className="flex flex-col items-center text-zinc-400">
                  <Phone className="w-5 h-5 text-[#D4AF37] mb-2" />
                  <a
                    href={`https://wa.me/${barberPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-light text-sm hover:text-[#D4AF37] transition-colors"
                  >
                    {formatPhone(barberPhone)}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide">Redes Sociais</h4>
            <p className="text-zinc-500 font-light text-sm leading-relaxed">
              Siga-nos para novidades e promoções exclusivas.
            </p>
            <div className="flex items-center justify-center gap-3">
              {hasPhone && (
                <a
                  href={`https://wa.me/${barberPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-11 h-11 rounded-full bg-[#141414] border-2 border-[#D4AF37]/40 flex items-center justify-center hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-500"
                >
                  <WhatsAppIcon className="w-5 h-5 text-[#D4AF37]" />
                </a>
              )}
              {barberInstagram && (
                <a
                  href={`https://www.instagram.com/${barberInstagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-11 h-11 rounded-full bg-[#141414] border-2 border-[#D4AF37]/40 flex items-center justify-center hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-500"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 stroke-[#D4AF37] fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ========== DESKTOP: Layout Original Grid ========== */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 mb-12">
          {/* Logo + Descrição */}
          <div className="space-y-2">
            <img
              src={brandLogo || '/assets/logo.webp'}
              alt={displayName}
              className="w-32 h-32 object-contain"
            />
            <p className="text-zinc-500 font-light text-xs leading-relaxed">
              Sua imagem é poder, cuide do seu.
            </p>
          </div>

          {/* Localização */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm tracking-wide">Localização</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-zinc-400">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-[#D4AF37] shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <p className="font-light text-sm leading-relaxed">
                  Av. Brasílio da Gama, 139
                  <br />
                  Bairro Tupi, BH
                </p>
              </div>
              {segSex && (
                <div className="flex items-start gap-3 text-zinc-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-[#D4AF37] shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                  <p className="font-light text-sm">
                    <span className="text-[#D4AF37]">Seg - Sáb:</span> {segSex}
                  </p>
                </div>
              )}
              {sabado && segSex !== `${sabado}` && (
                <div className="flex items-start gap-3 text-zinc-400">
                  <div className="w-4 h-4 shrink-0" />
                  <p className="font-light text-sm">
                    <span className="text-[#D4AF37]">Sábado:</span> {sabado}
                  </p>
                </div>
              )}
              {hasPhone && (
                <div className="flex items-start gap-3 text-zinc-400">
                  <Phone className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <a
                    href={`https://wa.me/${barberPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-light text-sm hover:text-[#D4AF37] transition-colors"
                  >
                    {formatPhone(barberPhone)}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm tracking-wide">Redes Sociais</h4>
            <p className="text-zinc-500 font-light text-sm leading-relaxed">
              Siga-nos para novidades e promoções exclusivas.
            </p>
            <div className="flex items-center gap-3">
              {hasPhone && (
                <a
                  href={`https://wa.me/${barberPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-11 h-11 rounded-full bg-[#141414] border-2 border-[#D4AF37]/40 flex items-center justify-center hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-500"
                >
                  <WhatsAppIcon className="w-5 h-5 text-[#D4AF37]" />
                </a>
              )}
              {barberInstagram && (
                <a
                  href={`https://www.instagram.com/${barberInstagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-11 h-11 rounded-full bg-[#141414] border-2 border-[#D4AF37]/40 flex items-center justify-center hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-500"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 stroke-[#D4AF37] fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bottom - Ambos */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col items-center gap-4">
          <p className="text-xs font-light text-zinc-500 text-center">
            © 2026 {displayName}. Todos os direitos reservados.
          </p>
          <Link
            to="/admin/login"
            className="flex items-center gap-2 text-[10px] font-medium text-zinc-600 uppercase tracking-[0.3em] hover:text-[#D4AF37] transition-colors duration-300"
          >
            <Lock className="w-3 h-3" />
            Acesso Restrito
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
