import { type FC, type ReactNode, useState, useEffect } from 'react';
import { useBarberContext } from '../../../contexts/BarberContext';
import { useSubscription } from '../../../hooks/useSubscription';
import { getOwnerPixKey } from '../../../lib/api/subscriptions';
import { SkeletonDashboard } from '../../Skeleton';
import { AlertTriangle, CreditCard, CheckCircle, Copy } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

/**
 * SubscriptionGuard - Verifica se a assinatura do barbeiro está ativa.
 * - Owners (donos) sempre passam (assinatura gratuita)
 * - Barbeiros com assinatura ativa passam
 * - Barbeiros sem assinatura ou expirados veem tela de pagamento
 */
const SubscriptionGuard: FC<SubscriptionGuardProps> = ({ children }) => {
  const { currentBarber, isOwner } = useBarberContext();
  const { status, loading, payments } = useSubscription(currentBarber?.id);

  const [ownerPixKey, setOwnerPixKey] = useState<string | null>(null);
  const [pixKeyLoading, setPixKeyLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getOwnerPixKey().then((key) => {
      setOwnerPixKey(key);
      setPixKeyLoading(false);
    });
  }, []);

  const handleCopyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  // Owners sempre passam
  if (isOwner) {
    return <>{children}</>;
  }

  // Loading
  if (loading || pixKeyLoading) {
    return (
      <div className="p-6">
        <SkeletonDashboard />
      </div>
    );
  }

  // Sem subscription registrada - mostra como livre (owner já tratado acima)
  if (!status?.has_subscription) {
    return <>{children}</>;
  }

  // Assinatura ativa - pode acessar
  if (status.is_active) {
    const daysLeft = status.days_remaining;
    const periodEnd = status.current_period_end
      ? (() => {
          const [y, m, d] = status.current_period_end!.split('-');
          return `${d}/${m}/${y}`;
        })()
      : null;

    // Mostra aviso se estiver perto de vencer
    if (daysLeft <= 7 && daysLeft > 0) {
      return (
        <>
          <div className="sticky top-0 z-50 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
              <AlertTriangle size={12} />
              <span>
                Assinatura válida até{' '}
                <strong>{periodEnd || `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}</strong>.{' '}
                <span className="text-zinc-500">Pague via PIX para renovar.</span>
              </span>
            </div>
          </div>
          {children}
        </>
      );
    }

    return <>{children}</>;
  }

  // Assinatura expirada ou bloqueada - mostra tela de pagamento
  return (
    <div className="min-h-screen bg-[var(--color-dark-pure)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <CreditCard size={28} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Assinatura Necessária</h2>
            <p className="text-sm text-zinc-400">
              Sua assinatura do Black Diamond está{' '}
              <strong className="text-red-400">
                {status.status === 'expired' ? 'expirada' : 'pendente'}
              </strong>
              .
            </p>
            <p className="text-xs text-zinc-500">
              Faça o pagamento de <strong className="text-[#D4AF37]">R$ 50,00</strong> via PIX para
              liberar seu acesso. Pague no{' '}
              <strong className="text-[#D4AF37]">último dia do mês</strong> e garanta o mês inteiro
              seguinte.
            </p>
          </div>

          {/* PIX Key Display */}
          <div className="px-6 pb-6 space-y-3">
            {ownerPixKey ? (
              <>
                <div className="bg-white/[0.02] border border-[#D4AF37]/20 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 text-center">
                    Pague via PIX para a chave abaixo
                  </p>
                  <div className="flex items-center justify-between bg-black/40 border border-white/[0.04] rounded-lg px-4 py-3.5">
                    <span className="text-[15px] font-mono font-bold text-[#D4AF37] tracking-wider">
                      {ownerPixKey}
                    </span>
                    <button
                      onClick={() => handleCopyPix(ownerPixKey)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Copy size={10} />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                    Após pagar, avise o administrador para liberar seu acesso. Dica: pague no último
                    dia do mês e garanta o mês inteiro!
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-center">
                <p className="text-xs text-zinc-500">
                  Chave PIX não disponível. Entre em contato com o administrador.
                </p>
              </div>
            )}

            {payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-center text-[10px] text-zinc-600 uppercase tracking-wider">
                  Últimos pagamentos
                </p>
                {payments.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      {p.status === 'confirmed' ? (
                        <CheckCircle size={12} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={12} className="text-amber-400" />
                      )}
                      <span className="text-[11px] text-zinc-400">R$ {p.amount.toFixed(2)}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {p.status === 'confirmed'
                        ? 'Pago'
                        : p.status === 'pending'
                          ? 'Pendente'
                          : 'Vencido'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3">
            <p className="text-[10px] text-zinc-600 text-center">
              Após o pagamento, o administrador libera seu acesso manualmente.
              <br />
              Dúvidas? Fale com o administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGuard;
