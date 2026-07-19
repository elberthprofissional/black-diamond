import { type FC, type RefObject } from 'react';
import { Check } from 'lucide-react';
import { formatPricePublic } from '../../../lib/utils';
import type { Service } from '../../../types';

interface DayOption {
  value: number;
  label: string;
}

const DEFAULT_WEEK_DAYS: DayOption[] = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

interface PlanFormFieldsProps {
  nameInput: string;
  setNameInput: (v: string) => void;
  priceInput: string;
  setPriceInput: (v: string) => void;
  selectedServiceIds: string[];
  toggleService: (id: string) => void;
  allowedDays: number[];
  toggleDay: (day: number) => void;
  services: Service[];
  nameInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
  weekDays?: DayOption[];
  maxNameLength?: number;
  maxPriceLength?: number;
}

const PlanFormFields: FC<PlanFormFieldsProps> = ({
  nameInput,
  setNameInput,
  priceInput,
  setPriceInput,
  selectedServiceIds,
  toggleService,
  allowedDays,
  toggleDay,
  services,
  nameInputRef,
  onSubmit,
  weekDays = DEFAULT_WEEK_DAYS,
  maxNameLength = 30,
  maxPriceLength = 6,
}) => (
  <>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Nome do plano
        </span>
        <span className="text-[11px] text-zinc-600 tabular-nums">
          {nameInput.length}/{maxNameLength}
        </span>
      </div>
      <input
        ref={nameInputRef}
        type="text"
        value={nameInput}
        onChange={(e) => {
          if (e.target.value.length <= maxNameLength) setNameInput(e.target.value);
        }}
        placeholder="Ex: Plano Black"
        maxLength={maxNameLength}
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder:text-zinc-600"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />
    </div>

    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Preço mensal
      </span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[15px] font-medium">
          R$
        </span>
        <input
          type="text"
          value={priceInput}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d.,]/g, '');
            if (val.replace('.', '').replace(',', '').length <= maxPriceLength) {
              setPriceInput(val);
            }
          }}
          placeholder="0,00"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder:text-zinc-600"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
        />
      </div>
    </div>

    <div className="space-y-3">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Serviços inclusos
      </span>
      <p className="text-[12px] text-zinc-500 -mt-1">
        O que o mensalista pode usar sem pagar à parte.
      </p>
      <div className="space-y-1">
        {services.map((service) => {
          const selected = selectedServiceIds.includes(service.id);
          return (
            <button
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer rounded-xl border ${
                selected
                  ? 'bg-[#D4AF37]/[0.08] border-[#D4AF37]/30'
                  : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all shrink-0 ${
                  selected ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/20'
                }`}
              >
                {selected && <Check size={11} className="text-white stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-medium ${selected ? 'text-[#D4AF37]' : 'text-zinc-200'}`}
                >
                  {service.name}
                </p>
              </div>
              <span
                className={`text-[12px] font-semibold tabular-nums ${selected ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
              >
                {formatPricePublic(service.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>

    <div className="space-y-3">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
        Dias da semana
      </span>
      <p className="text-[12px] text-zinc-500 -mt-1">Dias em que o plano é válido.</p>
      <div className="flex gap-2">
        {weekDays.map((day) => {
          const selected = allowedDays.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer border ${
                selected
                  ? 'bg-[#D4AF37]/[0.1] border-[#D4AF37]/30 text-[#D4AF37]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:bg-white/[0.04]'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  </>
);

export default PlanFormFields;
