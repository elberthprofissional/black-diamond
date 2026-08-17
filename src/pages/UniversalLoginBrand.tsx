interface LoginMobileTitleProps {
  view: 'client' | 'admin';
}

/** Título da área — só mobile (desktop usa o texto do painel esquerdo). */
export function LoginMobileTitle({ view }: LoginMobileTitleProps) {
  return (
    <div className="lg:hidden mb-7 text-center">
      <span className="font-cinzel tracking-[0.25em] uppercase text-[12px] font-bold text-gold/85">
        {view === 'admin' ? 'Área do Barbeiro' : 'Área do Cliente'}
      </span>
      <p className="text-[14px] text-zinc-400/90 mt-2.5 leading-relaxed">
        {view === 'admin'
          ? 'Entre com seu e-mail e senha para gerenciar a agenda.'
          : 'Entre para agendar e acompanhar seu atendimento.'}
      </p>
    </div>
  );
}

interface LoginBrandProps {
  brandLogo: string | null;
  displayName: string;
  firstName: string;
  restName: string;
  onLogoClick: () => void;
}

/** Logo + nome da barbearia + ornament divider. */
export function LoginBrand({
  brandLogo,
  displayName,
  firstName,
  restName,
  onLogoClick,
}: LoginBrandProps) {
  return (
    <div className="mb-4 lg:mb-5 text-center">
      <div className="relative mb-2 lg:mb-2.5 inline-block cursor-pointer" onClick={onLogoClick}>
        <div className="logo-ring" aria-hidden />
        <div className="w-14 h-14 lg:w-[72px] lg:h-[72px] rounded-2xl bg-[#111] border border-white/[0.08] p-1.5 lg:p-2 flex items-center justify-center overflow-hidden">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={displayName}
              className="w-full h-full object-contain rounded-xl"
            />
          ) : (
            <img
              src="/assets/logo.webp"
              alt={displayName}
              className="w-full h-full object-cover rounded-xl"
            />
          )}
        </div>
      </div>
      <h2 className="text-[26px] lg:text-[32px] leading-none font-black text-white tracking-[0.08em] lg:tracking-[0.1em] uppercase">
        {firstName}
      </h2>
      <h2 className="gold-engraved font-cinzel text-[20px] lg:text-[26px] font-bold leading-none mt-1 lg:mt-1.5 tracking-[0.08em] lg:tracking-[0.1em] uppercase">
        {restName}
      </h2>
      {/* Linha dourada — mobile: simples; desktop: ornament divider */}
      <div className="mt-3 w-8 h-px bg-gold/50 mx-auto lg:hidden" aria-hidden />
      <div className="mt-3.5 hidden lg:block ornament-divider">
        <span className="ornament-divider__line" />
        <span className="ornament-divider__gem" />
        <span className="ornament-divider__line ornament-divider__line--r" />
      </div>
    </div>
  );
}
