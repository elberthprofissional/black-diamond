import React from 'react';
import { User } from 'lucide-react';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface DataStepProps {
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  layout: 'desktop' | 'mobile';
  isMensalista: boolean;
  clientLookupLoading: boolean;
}

const DataStep: React.FC<DataStepProps> = React.memo(
  ({ name, phone, onNameChange, onPhoneChange, layout, isMensalista, clientLookupLoading }) => {
    if (layout === 'desktop') {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg space-y-10">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Seus dados</h2>
              <p className="text-[14px] text-zinc-500">Preencha suas informações para continuar.</p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="name-desktop"
                  className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider"
                >
                  Nome
                </label>
                <input
                  id="name-desktop"
                  type="text"
                  placeholder="Digite seu nome completo"
                  aria-label="Seu nome"
                  aria-describedby={
                    name && name.trim().length < 3 ? 'name-error-desktop' : undefined
                  }
                  aria-invalid={!!(name && name.trim().length < 3)}
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#C5A059] py-4 px-0 text-[16px] text-white outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
                {name && name.trim().length < 3 && (
                  <p id="name-error-desktop" className="text-[11px] text-red-400/80" role="alert">
                    Mínimo 3 caracteres
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="phone-desktop"
                    className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider"
                  >
                    WhatsApp
                  </label>
                  {clientLookupLoading && (
                    <span className="text-[11px] text-zinc-600 animate-pulse">Verificando...</span>
                  )}
                  {isMensalista && !clientLookupLoading && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      <span className="text-[10px] font-bold text-[#C5A059] uppercase">
                        Mensalista
                      </span>
                    </span>
                  )}
                </div>
                <input
                  id="phone-desktop"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  aria-label="Seu número de WhatsApp com DDD"
                  aria-describedby={
                    phone && phone.replace(/\D/g, '').length < 11
                      ? 'phone-error-desktop'
                      : undefined
                  }
                  aria-invalid={!!(phone && phone.replace(/\D/g, '').length < 11)}
                  className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#C5A059] py-4 px-0 text-[16px] text-white outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                />
                {phone && phone.replace(/\D/g, '').length < 11 && (
                  <p id="phone-error-desktop" className="text-[11px] text-red-400/80" role="alert">
                    Informe um WhatsApp válido com DDD
                  </p>
                )}
              </div>
            </div>

            {/* Helper */}
            <div className="pt-4">
              <p className="text-[12px] text-zinc-600">
                {isMensalista
                  ? 'Seus dados já estão salvos. Confirme para continuar.'
                  : 'Seus dados ficam salvos para próximos agendamentos.'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Mobile layout unchanged
    return (
      <div className="space-y-4 pb-4">
        <div className="space-y-3">
          <label
            htmlFor="name-mobile"
            className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5"
          >
            <User size={12} className="text-[#C5A059]/60" />
            Nome
          </label>
          <input
            id="name-mobile"
            type="text"
            placeholder="Digite seu nome..."
            aria-label="Seu nome"
            aria-describedby={name && name.trim().length < 3 ? 'name-error-mobile' : undefined}
            aria-invalid={!!(name && name.trim().length < 3)}
            className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
          {name && name.trim().length < 3 && (
            <p id="name-error-mobile" className="text-[10px] text-red-400/80" role="alert">
              Mínimo 3 caracteres
            </p>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="phone-mobile"
              className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5"
            >
              <WhatsAppIcon className="w-3 h-3 text-[#C5A059]" />
              WhatsApp
            </label>
            {isMensalista && !clientLookupLoading && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
                <span className="text-[8px] font-bold text-[#C5A059] uppercase">Mensalista</span>
              </span>
            )}
            {clientLookupLoading && (
              <span className="text-[9px] text-zinc-600 animate-pulse">Verificando...</span>
            )}
          </div>
          <input
            id="phone-mobile"
            type="tel"
            placeholder="(00) 90000-0000"
            aria-label="Seu número de WhatsApp com DDD"
            aria-describedby={
              phone && phone.replace(/\D/g, '').length < 11 ? 'phone-error-mobile' : undefined
            }
            aria-invalid={!!(phone && phone.replace(/\D/g, '').length < 11)}
            className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
          {phone && phone.replace(/\D/g, '').length < 11 && (
            <p id="phone-error-mobile" className="text-[10px] text-red-400/80" role="alert">
              Informe um WhatsApp válido
            </p>
          )}
        </div>
      </div>
    );
  }
);

DataStep.displayName = 'DataStep';

export default DataStep;
