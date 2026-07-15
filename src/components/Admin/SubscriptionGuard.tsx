import { type ReactNode, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionGuardProps {
  children: ReactNode;
}

const SubscriptionGuard: FC<SubscriptionGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { isActive, onTrial, trialDaysLeft, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  // Se tem assinatura paga ou trial válido, libera acesso
  if (isActive || (onTrial && trialDaysLeft > 0)) {
    return <>{children}</>;
  }

  // Sem acesso — mostra tela de assinatura necessária
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C5A059]/10 mb-6">
          <CreditCard size={28} className="text-[#C5A059]" />
        </div>

        <h1 className="text-2xl font-black tracking-tight mb-3">Assinatura necessária</h1>

        <p className="text-zinc-400 text-sm mb-8">
          Para acessar o painel administrativo, você precisa de uma assinatura ativa do Black
          Diamond.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/planos')}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C5A059] text-black font-bold text-sm rounded-xl hover:bg-[#D4B06A] transition-colors"
          >
            Ver planos
            <ArrowRight size={16} />
          </button>

          <p className="text-xs text-zinc-500">Comece com 15 dias de teste grátis</p>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionGuard;
