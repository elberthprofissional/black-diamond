import { type FC } from 'react';
import { useBarberContext } from '../contexts/BarberContext';
import { useSubscription } from '../hooks/useSubscription';
import AdminLayout from '../components/Admin/AdminLayout';
import { SkeletonDashboard } from '../components/Skeleton';

import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Crown,
} from 'lucide-react';
import { useState } from 'react';


const SubscriptionPage: FC = () => {
  const { currentBarber, isOwner } = useBarberContext();
  const { status, loading, payments, generatePayment, generatingPayment, paymentResult, paymentError } =
    useSubscription(currentBarber?.id);
  const [copied, setCopied] = useState(false);

  const handleCopyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <AdminLayout hideBottomTabs>
        <div className="space-y-4 max-w-2xl mx-auto">
          <SkeletonDashboard />
        </div>
      </AdminLayout>
    );
  }

  const isActive = status?.is_active;
  const daysLeft = status?.days_remaining ?? 0;
  const blocked = status?.is_blocked;

  return (
    <AdminLayout
      hideBottomTabs
      mainClassName="w-full mx-auto px-4 sm:px-6 pt-20 lg:pt-8 pb-24 max-w-[600px]"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Assinatura</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isOwner
              ? 'Você é o proprietário. Assinatura gratuita.'
              : 'Gerencie sua assinatura mensal do Black Diamond'}
          </p>
        </div>

        {/* Status Card */}
        <div
          className={`rounded-2xl border p-5 ${
            isActive
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : blocked
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : blocked
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {isActive ? (
                  <CheckCircle size={20} />
                ) : blocked ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Clock size={20} />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {isActive
                    ? 'Assinatura Ativa'
                    : blocked
                      ? 'Assinatura Bloqueada'
                      : 'Pagamento Pendente'}
                </p>
                {isActive && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {daysLeft > 0
                      ? `Vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`
                      : 'Vence hoje'}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#D4AF37]">R$ 50,00</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">/mês</p>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {!isOwner && (
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-5">
              <h3 className="text-sm font-bold text-white mb-1">
                {isActive ? 'Renovar Assinatura' : 'Pagar Assinatura'}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                {isActive
                  ? 'Gere um novo PIX para renovar sua assinatura por mais 30 dias.'
                  : 'Gere um PIX ou link de pagamento para liberar seu acesso.'}
              </p>

              <button
                onClick={generatePayment}
                disabled={generatingPayment}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {generatingPayment ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    Gerar PIX para Pagamento
                  </>
                )}
              </button>

              {paymentError && (
                <p className="text-xs text-red-400 text-center mt-3">{paymentError}</p>
              )}

              {/* PIX QR Code */}
              {paymentResult?.pix_qrcode && (
                <div className="mt-4 space-y-3">
                  <div className="bg-white rounded-xl p-4 flex justify-center">
                    <img
                      src={`data:image/png;base64,${paymentResult.pix_qrcode.encodedImage}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
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
              )}

              {!paymentResult && generatingPayment === false && isActive && (
                <p className="text-[10px] text-zinc-600 text-center mt-3">
                  Sua assinatura está ativa. Gere um novo pagamento apenas quando quiser renovar.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Histórico de Pagamentos
              </h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {payments.slice(0, 6).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {payment.status === 'confirmed' ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : payment.status === 'overdue' ? (
                      <AlertTriangle size={14} className="text-red-400" />
                    ) : (
                      <Clock size={14} className="text-zinc-600" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-white">
                        R$ {payment.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {payment.payment_method === 'pix' ? 'PIX' : payment.payment_method || '—'}
                        {payment.paid_at && (
                          <> · {new Date(payment.paid_at).toLocaleDateString('pt-BR')}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      payment.status === 'confirmed'
                        ? 'text-emerald-400'
                        : payment.status === 'overdue'
                          ? 'text-red-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {payment.status === 'confirmed'
                      ? 'Pago'
                      : payment.status === 'pending'
                        ? 'Pendente'
                        : payment.status === 'overdue'
                          ? 'Vencido'
                          : payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Crown size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white mb-1">Black Diamond Pro</p>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Sua assinatura dá acesso completo ao sistema de agendamento, gestão de clientes,
                relatórios e muito mais. Pagamento via PIX é processado pelo Asaas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubscriptionPage;
