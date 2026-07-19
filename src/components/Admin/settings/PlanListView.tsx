import { type FC } from 'react';
import { Plus, Pencil, Trash2, Crown } from 'lucide-react';
import { formatPrice } from '../../../lib/utils';
import type { MensalistaPlan, Service } from '../../../types';

interface PlanListViewProps {
  plans: MensalistaPlan[];
  services: Service[];
  maxPlans: number;
  enabled: boolean;
  onEdit: (plan: MensalistaPlan) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const getServiceName = (services: Service[], id: string) =>
  services.find((s) => s.id === id)?.name || '?';

const PlanListView: FC<PlanListViewProps> = ({
  plans,
  services,
  maxPlans,
  enabled,
  onEdit,
  onDelete,
  onAdd,
}) => (
  <div className={`transition-opacity ${enabled ? '' : 'opacity-30 pointer-events-none'}`}>
    {/* Header - Desktop */}
    <div className="hidden lg:flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-white text-[15px] font-semibold">Planos cadastrados</h3>
        <span className="text-[11px] text-zinc-500">
          ({plans.length}/{maxPlans})
        </span>
      </div>
      <button
        onClick={onAdd}
        disabled={plans.length >= maxPlans}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black font-semibold text-[12px] rounded-lg hover:bg-[#b8962e] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus size={14} strokeWidth={2.5} />
        Adicionar
      </button>
    </div>

    {/* Empty State */}
    {plans.length === 0 && (
      <div className="py-12 text-center">
        <p className="text-zinc-600 text-[13px]">Nenhum plano cadastrado</p>
      </div>
    )}

    {/* Desktop List */}
    {plans.length > 0 && (
      <div className="hidden lg:block border-t border-white/[0.06]">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex items-center justify-between py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 px-2 -mx-2 rounded-lg ${
              !plan.is_active ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  plan.is_active ? 'bg-[#D4AF37]/10' : 'bg-white/[0.04]'
                }`}
              >
                <Crown size={14} className={plan.is_active ? 'text-[#D4AF37]' : 'text-zinc-600'} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-white truncate">{plan.name}</span>
                  {plan.is_default && (
                    <span className="text-[8px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded uppercase">
                      Default
                    </span>
                  )}
                  {!plan.is_active && (
                    <span className="text-[8px] font-bold text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[12px] text-[#D4AF37] font-medium">
                    {formatPrice(plan.price, { locale: true })}
                    /mês
                  </span>
                  {plan.included_service_ids && plan.included_service_ids.length > 0 && (
                    <span className="text-[10px] text-zinc-500">
                      {plan.included_service_ids
                        .map((sid) => getServiceName(services, sid))
                        .join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(plan)}
                className="p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                title="Editar"
              >
                <Pencil size={14} className="text-zinc-500 hover:text-white transition-colors" />
              </button>
              <button
                onClick={() => onDelete(plan.id)}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                title="Excluir"
              >
                <Trash2 size={14} className="text-zinc-500 hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Mobile Cards */}
    {plans.length > 0 && (
      <div className="lg:hidden">
        <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.04]">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
              {plans.length}/{maxPlans} planos
            </span>
            <button
              onClick={onAdd}
              disabled={plans.length >= maxPlans}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[11px] font-medium rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>

          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`px-5 py-4 ${index > 0 ? 'border-t border-white/[0.04]' : ''} ${!plan.is_active ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] text-white font-medium truncate">{plan.name}</p>
                    {plan.is_default && (
                      <span className="text-[8px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded uppercase shrink-0">
                        Padrão
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[14px] text-[#D4AF37] font-bold">
                      {formatPrice(plan.price, { locale: true })}
                    </span>
                    <span className="text-[10px] text-zinc-500">/mês</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <button
                    onClick={() => onEdit(plan)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                  >
                    <Pencil
                      size={14}
                      className="text-zinc-500 hover:text-white transition-colors"
                    />
                  </button>
                  <button
                    onClick={() => onDelete(plan.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2
                      size={14}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    />
                  </button>
                </div>
              </div>
              {plan.included_service_ids && plan.included_service_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.included_service_ids.map((sid) => (
                    <span
                      key={sid}
                      className="text-[10px] font-medium text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded"
                    >
                      {getServiceName(services, sid)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default PlanListView;
