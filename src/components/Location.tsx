import React from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';

const Location: React.FC = () => {
  return (
    <section id="localização" className="py-20 md:py-32 bg-[#141414]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-12">
          
          {/* Header */}
          <div className="text-center lg:text-left">
            <h3 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 uppercase">
              ONDE ESTAMOS <span className="italic font-light text-[#D4AF37]">LOCALIZADOS.</span>
            </h3>
            <div className="w-8 h-px bg-[#D4AF37]/30 mx-auto lg:mx-0"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            
            {/* Map Column */}
            <div className="w-full relative aspect-video lg:aspect-square max-h-[400px]">
              <div className="w-full h-full bg-[#1a1a1a] border border-white/[0.03] overflow-hidden shadow-2xl">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d60047.792673869924!2d-43.9588257!3d-19.8405012!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa685e76e58e90f%3A0xf899efab3913f3f7!2sBarbearia%20Black%20Diamond!5e0!3m2!1spt-BR!2sbr!4v1782578430638!5m2!1spt-BR!2sbr"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  className="absolute inset-0"
                ></iframe>
              </div>
            </div>

            {/* Info Column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-8 md:gap-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                  <div>
                    <h4 className="text-[#D4AF37] font-black text-[9px] tracking-[0.3em] uppercase mb-2">Endereço</h4>
                    <p className="text-zinc-400 font-light text-sm md:text-base leading-relaxed">
                      Av. Brasílio da Gama, 139<br />
                      Bairro Tupi, BH 
                      <a 
                        href="https://maps.app.goo.gl/Gz453umZQtWGYcvV8" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block ml-2 text-[#D4AF37] text-[9px] font-bold uppercase tracking-widest hover:underline lg:hidden"
                      >
                        Abrir no Google Maps
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                  <div>
                    <h4 className="text-[#D4AF37] font-black text-[9px] tracking-[0.3em] uppercase mb-2">Horário</h4>
                    <p className="text-zinc-400 font-light text-sm md:text-base leading-relaxed">
                      Segunda a Sábado<br />08:30 às 19:00
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#D4AF37]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[#D4AF37] font-black text-[9px] tracking-[0.3em] uppercase mb-2">WhatsApp</h4>
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
                          className="text-zinc-400 font-light text-sm md:text-base hover:text-[#D4AF37] transition-colors"
                        >
                          {formattedPhone}
                        </a>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="hidden lg:block">
                <button 
                  onClick={() => window.open('https://maps.app.goo.gl/Gz453umZQtWGYcvV8', '_blank')}
                  className="w-full sm:w-auto px-8 py-4 border border-[#D4AF37]/30 text-[9px] font-black uppercase tracking-[0.3em] text-white flex items-center justify-center gap-3 hover:bg-[#D4AF37] hover:text-black transition-all duration-500"
                >
                  Abrir no Google Maps
                  <Navigation className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;

