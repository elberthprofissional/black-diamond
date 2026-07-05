import { motion } from 'framer-motion';

export default function LoginBackground() {
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="space-y-8 max-w-xl"
        >
          <div className="w-12 h-[2px] bg-[#C5A059]" />
          <h2 className="flex flex-col gap-2">
            <span className="text-2xl xl:text-3xl font-bebas tracking-[0.3em] text-white uppercase">
              Gestão
            </span>
            <span className="text-6xl xl:text-7xl font-bebas leading-[0.9] tracking-widest text-[#C5A059] italic pr-4 uppercase">
              Black Diamond
            </span>
          </h2>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 leading-relaxed max-w-md">
            Sua barbearia na palma da mão. Acompanhe sua agenda, clientes e faturamento de forma
            simples.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
