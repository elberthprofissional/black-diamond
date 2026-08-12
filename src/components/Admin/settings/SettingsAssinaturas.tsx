import { type FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBarberContext } from '../../../contexts/BarberContext';
import {
  checkSubscriptionStatus,
  markAsPaid,
  saveOwnerPixKey,
  getOwnerPixKey,
  type SubscriptionStatus,
} from '../../../lib/api/subscriptions';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { Crown, Copy, Check, Pencil, X, Loader2, User, Calendar } from 'lucide-react';
import type { Barber } from '../../../types';

interface BarberWithSub {
  barber: Barber;
  subscription: SubscriptionStatus | null;
}

const SettingsAssinaturas: FC = () => {
  const { toast, showSuccess, showError } = useToast();
  const { isOwner, loading: barbersLoading } = useBarberContext();

  const [barbers, setBarbers] = useState<BarberWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [ownerPixKey, setOwnerPixKey] = useState('');
  const [pixKeyLoading, setPixKeyLoading] = useState(true);
  const [editingPix, setEditingPix] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const [savingPix, setSavingPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Exclui perfis ocultos (is_hidden — ex.: dono/dev que não atende) da lista.
      const { data: allBarbers } = await supabase
        .from('barbers')
        .select('*')
        .eq('is_hidden', false)
        .order('name');
      const pixVal = await getOwnerPixKey();
      setOwnerPixKey(pixVal || '');
      setPixInput(pixVal || '');
      setPixKeyLoading(false);

      if (!allBarbers) {
        setBarbers([]);
        return;
      }

      const withSubs: BarberWithSub[] = await Promise.all(
        allBarbers.map(async (b: Barber) => {
          if (!b.is_owner) {
            try {
              const sub = await checkSubscriptionStatus(b.id);
              return { barber: b, subscription: sub };
            } catch {
              return { barber: b, subscription: null };
            }
          }
          return { barber: b, subscription: null };
        })
      );
      setBarbers(withSubs);
    } catch {
      showError('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOwner) loadData();
  }, [isOwner]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleConfirm = async (barberId: string) => {
    setConfirmingId(barberId);
    try {
      await markAsPaid(barberId);
      showSuccess('Pagamento confirmado! Acesso liberado.');
      await loadData();
    } catch {
      showError('Erro ao confirmar');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSavePix = async () => {
    const cleaned = pixInput.trim();
    if (!cleaned) {
      showError('Digite uma chave PIX');
      return;
    }
    setSavingPix(true);
    try {
      await saveOwnerPixKey(cleaned);
      setOwnerPixKey(cleaned);
      setEditingPix(false);
      showSuccess('Chave PIX atualizada!');
    } catch {
      showError('Erro ao salvar');
    } finally {
      setSavingPix(false);
    }
  };

  // Auth gate: somente dono (is_owner) gerencia assinaturas.
  // O perfil de suporte/dev também é is_owner no banco — regra configurável.
  if (barbersLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-zinc-600" />
      </div>
    );
  }
  if (!isOwner) return null;

  if (loading || pixKeyLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/[0.02] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const totalNonOwners = barbers.filter((b) => !b.barber.is_owner).length;
  const activeCount = barbers.filter((b) => b.subscription?.is_active).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto lg:mx-0">
      {/* ── Desktop Header ── */}
      <div className="hidden lg:flex items-center justify-between py-2">
        <div>
          <h3 className="text-[16px] font-bold text-white">Assinaturas</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {totalNonOwners > 0
              ? `${activeCount}/${totalNonOwners} ativas · R$ 50,00/mês por barbeiro`
              : 'Nenhuma assinatura ativa'}
          </p>
        </div>
      </div>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden flex items-center justify-between py-2">
        <div>
          <h3 className="text-[16px] font-bold text-white">Assinaturas</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {totalNonOwners > 0
              ? `${activeCount}/${totalNonOwners} ativas`
              : 'Nenhuma assinatura ativa'}
          </p>
        </div>
      </div>

      {/* ── Como funciona ── */}
      <div className="bg-[#111111] border border-white/[0.04] rounded-xl px-5 py-3.5">
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          <strong className="text-white">R$ 50,00/mês</strong> — Pague no último dia do mês, leva o
          mês inteiro seguinte. Clique em{' '}
          <strong className="text-emerald-400">Confirmar Pagamento</strong> quando receber o PIX do
          barbeiro.
        </p>
      </div>

      {/* ── PIX Key ── */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Crown size={15} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">Sua Chave PIX</p>
                <p className="text-[11px] text-zinc-500">Os barbeiros usam essa chave pra pagar</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingPix(!editingPix);
                setPixInput(ownerPixKey);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-zinc-400 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
            >
              <Pencil size={12} />
              {editingPix ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editingPix ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pixInput}
                onChange={(e) => setPixInput(e.target.value)}
                placeholder="CPF, CNPJ, email, Telefone ou chave aleatória"
                className="flex-1 bg-black/40 border border-white/[0.06] rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-gold/40 transition-all placeholder:text-zinc-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePix();
                  if (e.key === 'Escape') setEditingPix(false);
                }}
              />
              <button
                onClick={handleSavePix}
                disabled={savingPix || !pixInput.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-30 cursor-pointer"
              >
                {savingPix ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button
                onClick={() => {
                  setEditingPix(false);
                  setPixInput(ownerPixKey);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-black/40 border border-white/[0.04] rounded-xl px-4 py-3">
              <span className="text-[14px] font-mono font-bold text-emerald-400 tracking-wider">
                {ownerPixKey || 'Não configurada'}
              </span>
              {ownerPixKey && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ownerPixKey);
                    setCopiedPix(true);
                    setTimeout(() => setCopiedPix(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-zinc-400 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
                >
                  <Copy size={12} />
                  {copiedPix ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Barber List (Desktop: Notion-style) ── */}
      {barbers.length > 0 && (
        <div className="hidden lg:block border-t border-white/[0.06]">
          {barbers.map((item) => (
            <div
              key={item.barber.id}
              className="flex items-center justify-between py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 px-2 -mx-2 rounded-lg"
            >
              {/* Left: Barber info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.08] shrink-0 overflow-hidden">
                  {item.barber.photo_url ? (
                    <img
                      src={item.barber.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-white truncate">
                      {item.barber.name}
                    </span>
                    {item.barber.is_owner && (
                      <span className="text-[10px] text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase font-bold">
                        Dono
                      </span>
                    )}
                  </div>
                  {!item.barber.is_owner && item.subscription && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.subscription.is_active ? (
                        <>
                          <span className="text-[12px] text-emerald-400 font-medium">Ativo</span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <Calendar size={10} />
                            {item.subscription.current_period_end
                              ? (() => {
                                  const parts = item.subscription.current_period_end!.split('-');
                                  return `até ${parts[2]}/${parts[1]}`;
                                })()
                              : `${item.subscription.days_remaining} dias`}
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] text-red-400 font-medium">
                          {item.subscription.is_blocked ? 'Bloqueado' : 'Pendente'}
                        </span>
                      )}
                    </div>
                  )}
                  {!item.barber.is_owner && !item.subscription && (
                    <p className="text-[12px] text-zinc-600 mt-0.5">Sem assinatura</p>
                  )}
                </div>
              </div>

              {/* Right: Action */}
              {item.barber.is_owner ? (
                <span className="text-[12px] text-zinc-600 shrink-0">Grátis</span>
              ) : (
                <button
                  onClick={() => handleConfirm(item.barber.id)}
                  disabled={confirmingId === item.barber.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold transition-all disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {confirmingId === item.barber.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  {confirmingId === item.barber.id ? 'Confirmando...' : 'Confirmar Pgto'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Barber List (Mobile: Cards) ── */}
      {barbers.length > 0 && (
        <div className="lg:hidden space-y-2">
          {barbers.map((item) => (
            <div
              key={item.barber.id}
              className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.08] shrink-0 overflow-hidden">
                    {item.barber.photo_url ? (
                      <img
                        src={item.barber.photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={16} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-white truncate">
                        {item.barber.name}
                      </span>
                      {item.barber.is_owner && (
                        <span className="text-[9px] text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase font-bold">
                          Dono
                        </span>
                      )}
                    </div>
                    {!item.barber.is_owner && item.subscription && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.subscription.is_active ? (
                          <span className="text-[12px] text-emerald-400 font-medium">
                            Ativo ·{' '}
                            {item.subscription.current_period_end
                              ? (() => {
                                  const parts = item.subscription.current_period_end!.split('-');
                                  return `até ${parts[2]}/${parts[1]}`;
                                })()
                              : `${item.subscription.days_remaining} dias`}
                          </span>
                        ) : (
                          <span className="text-[12px] text-red-400 font-medium">
                            {item.subscription.is_blocked ? 'Bloqueado' : 'Pendente'}
                          </span>
                        )}
                      </div>
                    )}
                    {!item.barber.is_owner && !item.subscription && (
                      <p className="text-[12px] text-zinc-600 mt-0.5">Sem assinatura</p>
                    )}
                  </div>
                </div>

                {!item.barber.is_owner && (
                  <button
                    onClick={() => handleConfirm(item.barber.id)}
                    disabled={confirmingId === item.barber.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold transition-all disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {confirmingId === item.barber.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Check size={11} />
                    )}
                    {confirmingId === item.barber.id ? '...' : 'Confirmar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {barbers.length === 0 && (
        <div className="py-16 text-center">
          <Crown size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-[14px]">Nenhum barbeiro cadastrado</p>
          <p className="text-zinc-600 text-[12px] mt-1">
            Cadastre barbeiros nas Configurações &gt; Barbeiros
          </p>
        </div>
      )}

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsAssinaturas;
