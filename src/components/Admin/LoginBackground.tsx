/**
 * Fundo premium 100% CSS para as telas de login — mesmo DNA do
 * BookingPreScreen aprovado: veludo escuro com virada quente,
 * spotlight dourado, orbs de brilho, feixe de luz, grid de luxo,
 * brasas subindo e grão de filme. Sem depender de foto de fundo.
 */

const EMBERS = [
  { left: '8%', size: 3, duration: 13, delay: 0, opacity: 0.5, drift: '40px' },
  { left: '22%', size: 2, duration: 10, delay: 2.5, opacity: 0.35, drift: '-28px' },
  { left: '38%', size: 3, duration: 14, delay: 1.2, opacity: 0.45, drift: '52px' },
  { left: '55%', size: 2, duration: 9, delay: 4.0, opacity: 0.3, drift: '-36px' },
  { left: '72%', size: 3, duration: 12, delay: 0.8, opacity: 0.5, drift: '32px' },
  { left: '88%', size: 2, duration: 11, delay: 3.3, opacity: 0.4, drift: '-24px' },
] as const;

export default function LoginBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Deep Dark Base */}
      <div className="absolute inset-0 bg-radial from-[#120d06] via-[#080808] to-[#030303]" />

      {/* Minimal base — dark velvet com leve virada quente */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0906] via-[#060605] to-[#030303]" />
      <div className="absolute inset-0 bg-gold/[0.03]" />

      {/* Central Gold Spotlight Effect — suave */}
      <div
        className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[540px] sm:w-[720px] h-[400px] sm:h-[520px] rounded-full bg-gradient-to-b from-gold/[0.10] via-gold/[0.03] to-transparent blur-[110px] opacity-80"
        style={{ animation: 'spotlight-drift 18s ease-in-out infinite' }}
      />

      {/* Dynamic Glow Orbs */}
      <div className="absolute top-[35%] -left-40 w-[360px] h-[360px] rounded-full bg-[#8B6914]/[0.06] blur-[120px] animate-pulse" />
      <div className="absolute bottom-[12%] -right-40 w-[400px] h-[400px] rounded-full bg-gold/[0.05] blur-[130px]" />

      {/* Sweeping light beam — lens flare dourado */}
      <div className="light-beam" />

      {/* Subtle Luxury Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #d4af37 1px, transparent 1px), linear-gradient(to bottom, #d4af37 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Vignette Layer for Focus */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Film grain — textura cinematográfica */}
      <div className="film-grain" />

      {/* Animated Gold Embers */}
      {EMBERS.map((ember, i) => (
        <span
          key={i}
          className="ember"
          style={
            {
              left: ember.left,
              width: ember.size,
              height: ember.size,
              animationDuration: `${ember.duration}s`,
              animationDelay: `${ember.delay}s`,
              '--ember-drift': ember.drift,
              '--ember-opacity': ember.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
