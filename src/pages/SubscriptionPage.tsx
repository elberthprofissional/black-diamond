import { type FC, useState, useEffect } from 'react';
import { useBarberContext } from '../contexts/BarberContext';
import { useSubscription } from '../hooks/useSubscription';
import { getOwnerPixKey } from '../lib/api/subscriptions';
import AdminLayout from '../components/Admin/AdminLayout';
import { SkeletonDashboard } from '../components/Skeleton';

import { CreditCard, CheckCircle, AlertTriangle, Clock, Copy, Loader2, Crown } from 'lucide-react';

const SubscriptionPage: FC = () => {
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
  const periodEnd = status?.current_period_end
    ? (() => {
        const [y, m, d] = status.current_period_end!.split('-');
        return `${d}/${m}/${y}`;
      })()
    : null;

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
                {isActive && periodEnd && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Válido até <span className="text-zinc-300 font-medium">{periodEnd}</span>
                  </p>
                )}
                {isActive && !periodEnd && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {daysLeft > 0
                      ? `Vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`
                      : 'Vence hoje'}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-gold">R$ 50,00</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">/mês</p>
            </div>
          </div>
        </div>

        {/* Payment Section - PIX Key from owner */}
        {!isOwner && (
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-5">
              <h3 className="text-sm font-bold text-white mb-1">
                {isActive ? 'Próximo Pagamento' : 'Pagar Assinatura'}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                {isActive
                  ? 'Sua assinatura está ativa. Pague R$ 50,00 no último dia do mês para garantir o mês inteiro seguinte.'
                  : 'Sua assinatura está pendente. Pague R$ 50,00 via PIX para liberar seu acesso.'}
              </p>

              {pixKeyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={16} className="animate-spin text-zinc-600" />
                </div>
              ) : ownerPixKey ? (
                <div className="space-y-3">
                  {/* PIX Key Display */}
                  <div className="bg-white/[0.02] border border-gold/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                        <CreditCard size={14} className="text-gold" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                          Chave PIX do proprietário
                        </p>
                        <p className="text-[13px] font-bold text-zinc-400">CPF / Celular / Email</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 border border-white/[0.04] rounded-lg px-4 py-3.5">
                      <span className="text-[15px] font-mono font-bold text-gold tracking-wider">
                        {ownerPixKey}
                      </span>
                      <button
                        onClick={() => handleCopyPix(ownerPixKey)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Copy size={10} />
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-300 mb-1">
                          Após pagar, avise o administrador!
                        </p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          Faça o PIX de <strong className="text-white">R$ 50,00</strong> para a
                          chave acima. Depois de pagar, avise o administrador para liberar seu
                          acesso. Se pagou no{' '}
                          <strong className="text-white">último dia do mês</strong>, leva o mês
                          inteiro seguinte! Se pagou antes, vale só até o fim deste mês.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500">
                    Chave PIX não configurada. Entre em contato com o administrador.
                  </p>
                </div>
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
            <Crown size={16} className="text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white mb-1">Black Diamond Pro</p>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Sua assinatura dá acesso completo ao sistema de agendamento, gestão de clientes,
                relatórios e muito mais. <strong className="text-white">R$ 50,00/mês</strong> via
                PIX. Pague no último dia do mês e garanta o mês inteiro seguinte. No último dia de
                cada mês, o acesso é bloqueado até o próximo pagamento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubscriptionPage;
