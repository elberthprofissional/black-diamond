import { type FC } from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuccessStepProps {
  clientName: string;
  layout: 'desktop' | 'mobile';
  isOffline?: boolean;
}

const SuccessStep: FC<SuccessStepProps> = ({ clientName, layout, isOffline = false }) => {
  const navigate = useNavigate();

  const title = isOffline
    ? `${clientName ? `${clientName}, seu ` : 'Seu '}agendamento foi salvo!`
    : `${clientName ? `${clientName}, seu ` : 'Seu '}horário foi agendado!`;

  const subtitle = isOffline
    ? 'Sem internet no momento. Seu agendamento será enviado automaticamente quando a conexão voltar. 📡'
    : 'Você já garantiu seu horário! Aguardamos você. 💈';

  const icon = isOffline ? '📡' : '💈';

  if (layout === 'desktop') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto relative">
        {/* Decorative gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C5A059]/[0.03] rounded-full blur-3xl pointer-events-none" />

        {/* Animated checkmark */}
        <div className="relative mb-10">
          <div className="w-24 h-24 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center mx-auto animate-[scaleIn_0.5s_ease-out]">
            <svg
              className="w-10 h-10 text-[#C5A059]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline
                points="20 6 9 17 4 12"
                className="animate-[drawCheck_0.6s_ease-out_0.3s_both]"
                style={{ strokeDasharray: 30, strokeDashoffset: 30 }}
              />
            </svg>
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full border border-[#C5A059]/10 animate-[ping_2s_ease-out_infinite]" />
          <div className="absolute inset-0 rounded-full border border-[#C5A059]/5 animate-[ping_2s_ease-out_0.5s_infinite]" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{title}</h2>
        <p className="text-base text-zinc-500 mb-10 leading-relaxed">{subtitle}</p>

        {/* Gold divider */}
        <div className="w-12 h-[2px] bg-[#C5A059]/30 rounded-full mb-10" />

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-[#C5A059] text-black rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#A68233] active:scale-95 transition-all cursor-pointer"
          >
            Voltar ao início
          </button>
          <button
            onClick={() => window.open('https://wa.me/', '_blank')}
            className="px-8 py-3.5 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar no WhatsApp
          </button>
        </div>

        {/* Subtle confetti dots */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#C5A059]/20 animate-[float_3s_ease-in-out_infinite]"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col p-6 text-center">
      <div className="flex justify-start">
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="text-zinc-500 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-6">
        <div
          className={`w-20 h-20 rounded-full ${isOffline ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[#C5A059]/10 border-[#C5A059]/20'} border flex items-center justify-center mx-auto`}
        >
          {isOffline ? (
            <span className="text-3xl">{icon}</span>
          ) : (
            <Check size={32} className="text-[#C5A059]" />
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer mt-4"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
};

export default SuccessStep;
