import React from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { formatPhone } from '../lib/utils';
import { WhatsAppIcon } from './WhatsAppIcon';

const Location: React.FC = () => {
  const { barberPhone } = useBarberSettings();

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
                  title="Localização da Black Diamond no Google Maps"
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
                    <h4 className="text-[#D4AF37] font-black text-[9px] tracking-[0.3em] uppercase mb-2">
                      Endereço
                    </h4>
                    <p className="text-zinc-400 font-light text-sm md:text-base leading-relaxed">
                      Av. Brasílio da Gama, 139
                      <br />
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
                    <h4 className="text-[#D4AF37] font-black text-[9px] tracking-[0.3em] uppercase mb-2">
                      Horário
                    </h4>
                    <p className="text-zinc-400 font-light text-sm md:text-base leading-relaxed">
                      Segunda a Sábado
                      <br />
                      08:30 às 19:00
                    </p>
                  </div>
                </div>

                {barberPhone && (
                  <div className="flex items-start gap-4">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-1">
                      <WhatsAppIcon className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h4 className="text-[#D4AF37] font-black text-[9px] tracking-[0.3em] uppercase mb-2">
                        WhatsApp
                      </h4>
                      <a
                        href={`https://wa.me/${barberPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 font-light text-sm md:text-base hover:text-[#D4AF37] transition-colors"
                      >
                        {formatPhone(barberPhone)}
                      </a>
                    </div>
                  </div>
                )}
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
