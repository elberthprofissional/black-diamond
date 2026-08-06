import { motion } from 'framer-motion';
import { useBarberSettings } from '../../hooks/useBarberSettings';

interface LoginBackgroundProps {
  /** Texto de apoio exibido ao lado da marca (default: focado em gestão). */
  subtitle?: string;
}

export default function LoginBackground({ subtitle }: LoginBackgroundProps) {
  const { brandName, brandColor } = useBarberSettings();
  const displayName = brandName || 'Black Diamond';
  const tagline = subtitle ?? 'Acompanhe agenda, clientes e faturamento em um só lugar.';

  return (
    <div className="hidden lg:flex lg:w-[55%] h-full relative overflow-hidden bg-[#0A0A0A] border-r border-white/5">
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <img
          src="/assets/login.webp"
          alt="Barbershop"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover grayscale opacity-20"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-transparent" />

      <div className="relative z-10 w-full h-full flex flex-col justify-between p-16 xl:p-24">
        <div />
        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="space-y-8 max-w-xl"
        >
          <div className="w-12 h-[2px]" style={{ backgroundColor: brandColor || '#d4af37' }} />
          <h2 className="flex flex-col gap-2">
            <span className="text-xl xl:text-2xl font-bebas tracking-[0.1em] text-zinc-300 uppercase">
              Gestão
            </span>
            <span
              className="text-5xl xl:text-6xl font-bebas leading-[0.9] tracking-[0.05em] italic pr-4"
              style={{ color: brandColor || '#d4af37' }}
            >
              {displayName}
            </span>
          </h2>
          <p className="text-sm font-medium tracking-[0.05em] text-zinc-500 leading-relaxed max-w-md">
            {tagline}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
