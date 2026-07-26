import { type FC, type ReactNode, useState } from 'react';
import { useBarberContext } from '../../../contexts/BarberContext';
import { useSubscription } from '../../../hooks/useSubscription';
import { SkeletonDashboard } from '../../Skeleton';
import { AlertTriangle, CreditCard, CheckCircle, Loader2, Copy, ExternalLink } from 'lucide-react';

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
  const { status, loading, payments, generatePayment, generatingPayment, paymentResult, paymentError } =
    useSubscription(currentBarber?.id);

  const [copied, setCopied] = useState(false);

  // Owners sempre passam
  if (isOwner) {
    return <>{children}</>;
  }

  // Loading
  if (loading) {
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

    // Mostra aviso se estiver perto de vencer
    if (daysLeft <= 7 && daysLeft > 0) {
      return (
        <>
          <div className="sticky top-0 z-50 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
              <AlertTriangle size={12} />
              <span>
                Assinatura vence em <strong>{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</strong>.
                {' '}
                <button
                  onClick={generatePayment}
                  disabled={generatingPayment}
                  className="underline font-bold hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {generatingPayment ? 'Gerando...' : 'Renovar agora'}
                </button>
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
  const handleCopyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
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
              Para continuar usando o sistema, faça o pagamento da mensalidade de{' '}
              <strong className="text-[#D4AF37]">R$ 50,00</strong>.
            </p>
          </div>

          {/* Payment Actions */}
          <div className="px-6 pb-6 space-y-3">
            <button
              onClick={generatePayment}
              disabled={generatingPayment}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-50"
            >
              {generatingPayment ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Gerando pagamento...
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  Gerar PIX para Pagamento
                </>
              )}
            </button>

            {paymentError && (
              <p className="text-xs text-red-400 text-center">{paymentError}</p>
            )}

            {/* PIX QR Code & Copy */}
            {paymentResult?.pix_qrcode && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 flex justify-center">
                  <img
                    src={`data:image/png;base64,${paymentResult.pix_qrcode.encodedImage}`}
                    alt="PIX QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCopyPix(paymentResult.pix_qrcode!.payload)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Copy size={12} />
                    {copied ? 'Copiado!' : 'Copiar código PIX'}
                  </button>
                  <a
                    href={paymentResult.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    <ExternalLink size={12} />
                    Abrir link de pagamento
                  </a>
                </div>
              </div>
            )}

            {!paymentResult && payments.length > 0 && (
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
                      <span className="text-[11px] text-zinc-400">
                        R$ {p.amount.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {p.status === 'confirmed' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Vencido'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3">
            <p className="text-[10px] text-zinc-600 text-center">
              Após o pagamento, o acesso é liberado automaticamente em até 2 minutos.
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
