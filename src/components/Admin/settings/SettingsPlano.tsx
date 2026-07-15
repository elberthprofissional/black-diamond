import { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Globe, ExternalLink, Loader2, Clock } from 'lucide-react';
import {
  getPlans,
  getUserSubscription,
  createCheckoutSession,
  createPortalSession,
} from '../../../lib/api/billing';
import type { SubscriptionPlan, Subscription } from '../../../types';

const SettingsPlano: FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [plansData, subData] = await Promise.all([getPlans(), getUserSubscription()]);
      setPlans(plansData);
      setSubscription(subData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckout = async (planSlug: string) => {
    setCheckoutLoading(planSlug);
    try {
      const { url } = await createCheckoutSession(planSlug, false);
      if (url) window.location.assign(url);
    } catch (err) {
      console.error('Erro ao criar checkout:', err);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await createPortalSession();
      if (url) window.location.assign(url);
    } catch (err) {
      console.error('Erro ao abrir portal:', err);
    }
  };

  // Calcular dias restantes do trial
  const getTrialDaysLeft = (): number => {
    if (!subscription || subscription.status !== 'trialing' || !subscription.trial_ends_at) {
      return 0;
    }
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const trialDaysLeft = getTrialDaysLeft();
  const isOnTrial = subscription?.status === 'trialing' && trialDaysLeft > 0;

  const getPlanBySlug = (slug: string) => plans.find((p) => p.slug === slug);

  const mensal = getPlanBySlug('mensal-sdominio');
  const anual = getPlanBySlug('anual-sdominio');
  const mensalPlus = getPlanBySlug('mensal-cdominio');
  const anualPlus = getPlanBySlug('anual-cdominio');

  const allPlans = [
    { plan: mensal, slug: 'mensal-sdominio', popular: false, badge: null },
    { plan: anual, slug: 'anual-sdominio', popular: true, badge: 'ECONOMIA' },
    { plan: mensalPlus, slug: 'mensal-cdominio', popular: false, badge: 'LINK PRÓPRIO' },
    { plan: anualPlus, slug: 'anual-cdominio', popular: false, badge: 'COMPLETO' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-[#C5A059] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-white">Plano</h2>
        <p className="text-sm text-zinc-400 mt-1">Gerencie sua assinatura do Black Diamond</p>
      </div>

      {/* Trial Ativo */}
      {isOnTrial && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-300">
                Teste grátis — {trialDaysLeft}{' '}
                {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
              </p>
              <p className="text-xs text-blue-400/70 mt-1">
                Acesse todas as funcionalidades. Assine um plano antes do término para continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assinatura Ativa */}
      {subscription && subscription.status === 'active' && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-300">Assinatura ativa</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                {subscription.plan?.name || 'Plano ativo'}
              </p>
              {subscription.current_period_end && (
                <p className="text-xs text-zinc-400 mt-1">
                  Próxima cobrança:{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <button
              onClick={handleManageSubscription}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
            >
              Gerenciar
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Assinatura Pendente */}
      {subscription && subscription.status === 'pending' && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <CreditCard size={18} className="text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">Pagamento pendente</p>
              <p className="text-xs text-zinc-400 mt-1">
                Finalize o pagamento para ativar sua assinatura
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Planos - todos lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        {allPlans.map(({ plan, slug, popular, badge }) => {
          if (!plan) return null;

          const isAnnual = plan.interval_months === 12;
          const hasSetup = plan.price_setup > 0;
          const monthlyPrice = plan.price_monthly;
          const isCurrentPlan = subscription?.plan?.slug === slug;

          return (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative p-4 rounded-xl border transition-all ${
                popular
                  ? 'bg-gradient-to-b from-[#C5A059]/10 to-transparent border-[#C5A059]/30'
                  : 'bg-white/[0.02] border-white/10'
              }`}
            >
              {badge && (
                <span
                  className={`absolute -top-2 left-3 px-2 py-0.5 rounded text-[9px] font-bold ${
                    popular ? 'bg-[#C5A059] text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  {badge}
                </span>
              )}

              <h3 className="font-bold text-white text-sm mb-1">{plan.name}</h3>

              <div className="mb-3">
                {isAnnual ? (
                  <>
                    <span className="text-xl font-black text-white">
                      R$ {monthlyPrice.toFixed(0).replace('.', ',')}
                    </span>
                    <span className="text-zinc-400 text-xs">/mês</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Total: R$ {(monthlyPrice * 12).toFixed(0).replace('.', ',')}
                    </p>
                  </>
                ) : hasSetup ? (
                  <>
                    <p className="text-[10px] text-zinc-500 mb-0.5">1° mês</p>
                    <span className="text-xl font-black text-white">
                      R$ {plan.price_setup.toFixed(0).replace('.', ',')}
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-1">Depois:</p>
                    <span className="text-sm font-bold text-white">
                      R$ {monthlyPrice.toFixed(0).replace('.', ',')}
                    </span>
                    <span className="text-zinc-400 text-xs">/mês</span>
                  </>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">
                      R$ {monthlyPrice.toFixed(0).replace('.', ',')}
                    </span>
                    <span className="text-zinc-400 text-xs">/mês</span>
                  </div>
                )}
              </div>

              <ul className="space-y-1 mb-3">
                <li className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                  <Check size={10} className="text-[#C5A059] shrink-0" />
                  Agendamento 24/7
                </li>
                <li className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                  <Check size={10} className="text-[#C5A059] shrink-0" />
                  Dashboard completo
                </li>
                {hasSetup && (
                  <li className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                    <Globe size={10} className="text-[#C5A059] shrink-0" />
                    Link próprio
                  </li>
                )}
              </ul>

              <button
                onClick={() => handleCheckout(slug)}
                disabled={isCurrentPlan || checkoutLoading === slug}
                className={`w-full py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isCurrentPlan
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                    : popular
                      ? 'bg-[#C5A059] text-black hover:bg-[#D4B06A]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {checkoutLoading === slug ? (
                  <Loader2 size={12} className="animate-spin mx-auto" />
                ) : isCurrentPlan ? (
                  'Plano Atual'
                ) : (
                  'Assinar'
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] text-zinc-500 text-center">
        Detalhes completos em{' '}
        <a href="/planos" className="text-[#C5A059] hover:underline">
          /planos
        </a>
      </p>
    </div>
  );
};

export default SettingsPlano;
