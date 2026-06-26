import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';

const Footer: React.FC = () => {
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
                <span className="text-lg md:text-xl font-bebas tracking-widest text-[#D4AF37]">BLACK DIAMOND</span>
              </div>
            </div>

          </div>

          {/* Social & Contact Column (2nd) */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-white font-bebas text-base md:text-lg tracking-widest uppercase">Contatos</h4>
            <div className="space-y-3 md:space-y-4">
              {/* Instagram */}
              <a 
                href="https://www.instagram.com/black.diamond.barbeariaa/" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Acessar nosso perfil no Instagram"
                className="group flex items-center gap-3 md:gap-4 text-zinc-400 hover:text-[#D4AF37] transition-all duration-500"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/10 transition-all duration-500">
                  <Instagram size={14} className="md:w-4 md:h-4" />
                </div>
                <span className="font-roboto font-light text-xs md:text-sm">@black.diamond</span>
              </a>

              {/* WhatsApp */}
              {(() => {
                const rawPhone = import.meta.env.VITE_BARBER_WHATSAPP || '554399553590';
                const formattedPhone = rawPhone.length === 13 
                  ? `(${rawPhone.slice(4, 6)}) ${rawPhone.slice(6, 11)}-${rawPhone.slice(11)}`
                  : rawPhone;
                return (
                  <a 
                    href={`https://wa.me/${rawPhone}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label={`Entrar em contato via WhatsApp no número ${formattedPhone}`}
                    className="group flex items-center gap-3 md:gap-4 text-zinc-400 hover:text-[#D4AF37] transition-all duration-500"
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/10 transition-all duration-500">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <span className="font-roboto font-light text-xs md:text-sm group-hover:text-[#D4AF37] transition-colors">{formattedPhone}</span>
                  </a>
                );
              })()}
            </div>
          </div>

          {/* Hours Section (3rd) */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-white font-bebas text-base md:text-lg tracking-widest uppercase">Atendimento</h4>
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-[#D4AF37] font-bebas text-[12px] md:text-sm tracking-wider uppercase">Segunda - Sábado</span>
                <span className="text-zinc-400 font-roboto font-light text-xs md:text-sm">08:30 às 19:00</span>
              </div>
            </div>
          </div>

          {/* Address Column (4th) */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-white font-bebas text-base md:text-lg tracking-widest uppercase">Localização</h4>
            <div className="flex items-start gap-3 md:gap-4 text-zinc-400">
              <div className="shrink-0 mt-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 md:w-4 md:h-4 fill-[#D4AF37]">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <p className="font-roboto font-light text-xs md:text-sm leading-relaxed">
                Av. Brasílio da Gama, 139<br />Tupi, Belo Horizonte
              </p>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] md:text-[10px] font-roboto font-light text-zinc-500 uppercase tracking-[0.4em] text-center md:text-left">
            © 2026 Black Diamond — Todos os direitos reservados.
          </p>
          
          <Link 
            to="/admin" 
            aria-label="Acesso restrito para administradores"
            className="group flex items-center gap-3 px-4 py-2 bg-[#141414] border border-white/5 rounded-full hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-500"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
            <span className="text-[10px] font-bebas uppercase tracking-[0.1em] text-zinc-400 group-hover:text-[#D4AF37] transition-colors">Acesso Restrito</span>
          </Link>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

