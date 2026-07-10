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
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div
          className={`w-20 h-20 rounded-full ${isOffline ? 'bg-amber-500/10' : 'bg-[#C5A059]/10'} flex items-center justify-center mx-auto mb-8`}
        >
          {isOffline ? (
            <span className="text-3xl">{icon}</span>
          ) : (
            <Check size={36} className="text-[#C5A059]" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-base text-zinc-500 mb-8">{subtitle}</p>

        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Voltar ao início
        </button>
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
