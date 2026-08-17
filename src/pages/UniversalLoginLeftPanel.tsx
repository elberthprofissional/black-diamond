import { ArrowLeft } from 'lucide-react';

interface LoginLeftPanelProps {
  view: 'client' | 'admin';
  isPWA: boolean;
  onBack: () => void;
}

/**
 * Painel esquerdo (desktop) — imagem + texto contextual.
 * Mobile: fica oculto (o form ocupa a tela toda).
 */
export function LoginLeftPanel({ view, isPWA, onBack }: LoginLeftPanelProps) {
  return (
    <div
      className="relative overflow-hidden
        /* mobile: escondido — mobile usa só o painel direito */
        hidden
        /* desktop: painel grande visível */
        lg:block lg:h-auto lg:min-h-0 lg:col-span-1"
    >
      {/* Foto */}
      <img
        src="/assets/cadastrar-logar.webp"
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50
          lg:bg-gradient-to-r lg:from-transparent lg:via-black/15 lg:to-[#090909]"
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      <div className="absolute inset-0 film-grain" />

      {/* Gradiente de transição — borda direita (desktop) — estreito, só suaviza a borda */}
      <div
        className="hidden lg:block absolute inset-y-0 right-0 w-14 pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, #090909)' }}
        aria-hidden
      />

      {/* Gradiente de transição — borda inferior (mobile) */}
      <div
        className="lg:hidden absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #090909, transparent)' }}
        aria-hidden
      />

      {/* Botão voltar */}
      {!isPWA && (
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="absolute top-4 left-4 z-20 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl border border-white/[0.08] bg-black/30 hover:bg-black/50 tracking-wider uppercase backdrop-blur-sm lg:top-6 lg:px-3.5"
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">Voltar</span>
        </button>
      )}

      {/* Texto contextual — só desktop, posição premium no terço inferior */}
      <div className="hidden lg:flex absolute inset-0 flex-col justify-end pl-14 xl:pl-20 pr-24 pb-20">
        <div className="max-w-[400px]">
          {/* Linha dourada sutil */}
          <div className="w-8 h-px bg-gold/40 mb-5" aria-hidden />
          {view === 'admin' ? (
            <>
              <h1 className="text-[26px] xl:text-[30px] leading-[1.1] font-black text-white/90 tracking-[0.04em] uppercase mb-3">
                Área do Barbeiro
              </h1>
              <p className="text-[14px] xl:text-[15px] text-zinc-400/85 leading-[1.7]">
                Sua agenda, seus clientes e seus atendimentos em um só lugar.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[26px] xl:text-[30px] leading-[1.1] font-black text-white/90 tracking-[0.04em] uppercase mb-3">
                Área do Cliente
              </h1>
              <p className="text-[14px] xl:text-[15px] text-zinc-400/85 leading-[1.7]">
                Agende seu horário e cuide do seu estilo com quem entende.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoginMobileBackButtonProps {
  isPWA: boolean;
  onBack: () => void;
}

/** Botão voltar — mobile (o desktop usa o do painel esquerdo). */
export function LoginMobileBackButton({ isPWA, onBack }: LoginMobileBackButtonProps) {
  if (isPWA) return null;
  return (
    <button
      onClick={onBack}
      aria-label="Voltar"
      className="lg:hidden absolute top-4 left-4 z-20 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] tracking-wider uppercase backdrop-blur-sm"
    >
      <ArrowLeft size={13} />
    </button>
  );
}
