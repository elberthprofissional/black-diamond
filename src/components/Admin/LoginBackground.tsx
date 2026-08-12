import { motion } from 'framer-motion';
import { CalendarDays, Scissors, Clock3 } from 'lucide-react';
import { useBarberSettings } from '../../hooks/useBarberSettings';

interface LoginBackgroundProps {
  subtitle?: string;
}

export default function LoginBackground({ subtitle }: LoginBackgroundProps) {
  const { brandName, brandColor } = useBarberSettings();
  const displayName = brandName || 'Black Diamond';
  const tagline =
    subtitle ?? 'Corte, barba e tratamento exclusivo. Reserve seu horário em poucos toques.';

  const highlights = [
    {
      icon: CalendarDays,
      title: 'Agendamento rápido & sem filas',
      desc: 'Veja os horários livres em tempo real e garanta sua cadeira na barbearia.',
    },
    {
      icon: Scissors,
      title: 'Histórico & Preferências',
      desc: 'Seus serviços e cortes anteriores salvos para o próximo atendimento.',
    },
    {
      icon: Clock3,
      title: 'Total autonomia no seu celular',
      desc: 'Consulte, altere ou cancele seu horário sempre que precisar.',
    },
  ];

  return (
    <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden bg-[#070707] border-r border-white/[0.08]">
      {/* Background imagery with rich tone */}
      <motion.div
        initial={{ scale: 1.03 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <img
          src="/assets/login.webp"
          alt="Barbearia Black Diamond"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover grayscale opacity-30 mix-blend-luminosity"
        />
      </motion.div>

      {/* Modern gradient scrims */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-[#070707]/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#070707]/40 to-[#070707]" />

      <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 xl:p-20">
        {/* Brand header */}
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: brandColor || '#D4AF37' }}
          />
          <span className="text-[12px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
            {displayName}
          </span>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="space-y-10 max-w-lg my-auto"
        >
          <div className="space-y-4">
            <h2 className="text-5xl xl:text-6xl font-bebas tracking-wide text-white leading-[0.95] uppercase">
              Seu estilo em <br />
              <span style={{ color: brandColor || '#D4AF37' }}>primeiro lugar.</span>
            </h2>
            <p className="text-sm text-zinc-400 font-normal leading-relaxed max-w-md">{tagline}</p>
          </div>

          {/* Real customer highlights */}
          <div className="space-y-5 pt-6 border-t border-white/10">
            {highlights.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 group-hover:border-amber-400/40 transition-colors">
                    <IconComp size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-zinc-200">{item.title}</h3>
                    <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="text-[12px] text-zinc-500 font-medium flex items-center justify-between border-t border-white/[0.06] pt-6">
          <span>Atendimento com excelência</span>
          <span>{displayName}</span>
        </div>
      </div>
    </div>
  );
}
