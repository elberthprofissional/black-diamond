import { type FC } from 'react';
import { Phone, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { formatPhone } from '../lib/utils';

const Footer: FC = () => {
  const { barberPhone, barberInstagram, brandName } = useBarberSettings();
  const displayName = brandName || 'BLACK DIAMOND';
  const hasPhone = barberPhone && !/^0+$/.test(barberPhone) && barberPhone !== '5500000000000';

  return (
    <footer className="bg-[#0a0a0a] pt-16 pb-10 relative">
      {/* Full-width gold ruler */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 pb-10">
          {/* COL 1: Brand */}
          <div className="space-y-4">
            <p className="text-lg md:text-xl font-bold text-white/90 uppercase tracking-[0.06em]">
              {displayName}
            </p>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-xs font-light">
              Corte na régua. Barba na régua. Papo reto. Esquece fila — agenda, vem, senta e sai
              renovado.
            </p>
          </div>

          {/* COL 2: Contato */}
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 font-semibold">
              Contato
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={13} className="mt-0.5 text-[#D4AF37]/50 shrink-0" />
                <p className="text-[13px] text-zinc-400 leading-relaxed font-light">
                  Av. Brasílio da Gama, 139
                  <br />
                  Bairro Tupi, Belo Horizonte - MG
                </p>
              </div>
              {hasPhone && (
                <a
                  href={`https://wa.me/${barberPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[13px] text-zinc-400 hover:text-white transition-colors font-light group"
                >
                  <Phone
                    size={13}
                    className="text-[#D4AF37]/50 shrink-0 group-hover:text-[#D4AF37] transition-colors"
                  />
                  {formatPhone(barberPhone)}
                </a>
              )}
              <div className="flex items-center gap-3 text-[13px] text-zinc-400 font-light">
                <Clock size={13} className="text-[#D4AF37]/50 shrink-0" />
                <span>Seg-Sex: 08:00-18:00 · Sáb: 08:00-18:00</span>
              </div>
            </div>
          </div>

          {/* COL 3: Redes */}
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 font-semibold">
              Redes
            </p>
            <div className="flex items-center gap-4">
              {hasPhone && (
                <a
                  href={`https://wa.me/${barberPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-zinc-500 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all duration-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[17px] h-[17px]"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
              {barberInstagram && (
                <a
                  href={`https://www.instagram.com/${barberInstagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-zinc-500 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all duration-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[17px] h-[17px]"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />

        {/* ── BOTTOM BAR ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-zinc-700 tracking-wide font-light">
            © {new Date().getFullYear()} {displayName}. Todos os direitos reservados.
          </p>
          <Link
            to="/admin/login"
            className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] hover:text-zinc-500 transition-colors font-medium"
          >
            Acesso restrito
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
