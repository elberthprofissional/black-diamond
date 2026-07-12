import { useMemo, Fragment, type FC } from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';
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

const Location: FC = () => {
  const { barberPhone, barberHours } = useBarberSettings();

  const hours: HoursData | null = useMemo(() => {
    if (!barberHours) return null;
    try {
      return JSON.parse(barberHours);
    } catch {
      return null;
    }
  }, [barberHours]);

  const weekEnabled = hours?.['1']?.enabled;
  const satEnabled = hours?.['6']?.enabled;

  const hoursLines: string[] = [];
  if (
    hours &&
    weekEnabled &&
    satEnabled &&
    hours['1'].open === hours['6'].open &&
    hours['1'].close === hours['6'].close
  ) {
    hoursLines.push(`Segunda a Sábado`);
    hoursLines.push(`${hours['1'].open} às ${hours['1'].close}`);
  } else {
    if (hours && weekEnabled) {
      hoursLines.push(`Segunda a Sexta`);
      hoursLines.push(`${hours['1'].open} às ${hours['1'].close}`);
    }
    if (hours && satEnabled) {
      hoursLines.push(`Sábado`);
      hoursLines.push(`${hours['6'].open} às ${hours['6'].close}`);
    }
  }

  return (
    <section id="localizacao" className="py-16 md:py-24 bg-[#141414]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-12">
          {/* Header */}
          <div className="text-center lg:text-left">
            <h3 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 uppercase">
              ONDE ESTAMOS <span className="italic font-light text-[#D4AF37]">LOCALIZADOS.</span>
            </h3>
            <div className="w-8 h-px bg-[#D4AF37]/30 mx-auto lg:mx-0" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            {/* Mapa */}
            <div className="w-full h-[300px] lg:h-[400px] bg-[#1a1a1a] border border-white/[0.03] overflow-hidden shadow-2xl">
              <iframe
                src="https://www.google.com/maps?q=-19.8405012,-43.9588257&z=15&output=embed"
                style={{ border: 0, width: '100%', height: '100%' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização da Black Diamond no Google Maps"
              />
            </div>

            {/* Info */}
            <div className="space-y-8">
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
                    {hoursLines.length > 0
                      ? hoursLines.map((l, i) => (
                          <Fragment key={i}>
                            {i > 0 && <br />}
                            {l}
                          </Fragment>
                        ))
                      : 'Consulte nossos horários'}
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
    </section>
  );
};

export default Location;
