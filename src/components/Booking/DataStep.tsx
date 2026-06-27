import React from 'react';
import { User } from 'lucide-react';

interface DataStepProps {
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  layout: 'desktop' | 'mobile';
}

const DataStep: React.FC<DataStepProps> = React.memo(({ name, phone, onNameChange, onPhoneChange, layout }) => {
  if (layout === 'desktop') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xl">
          <div className="space-y-10">
            <div className="space-y-4">
              <label htmlFor="name-desktop" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Nome</label>
              <input 
                id="name-desktop"
                type="text" 
                placeholder="Digite seu nome..." 
                aria-label="Seu nome"
                aria-describedby={name && name.trim().length < 3 ? 'name-error-desktop' : undefined}
                aria-invalid={!!(name && name.trim().length < 3)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-2xl px-6 py-6 text-[20px] text-white outline-none transition-all placeholder:text-zinc-700" 
                value={name} 
                onChange={e => onNameChange(e.target.value)} 
              />
              {name && name.trim().length < 3 && (
                <p id="name-error-desktop" className="text-[11px] text-red-400/80" role="alert">Mínimo 3 caracteres</p>
              )}
            </div>
            <div className="space-y-4">
              <label htmlFor="phone-desktop" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">WhatsApp</label>
              <input 
                id="phone-desktop"
                type="tel" 
                placeholder="(31) 90000-0000" 
                aria-label="Seu número de WhatsApp com DDD"
                aria-describedby={phone && phone.replace(/\D/g, '').length < 11 ? 'phone-error-desktop' : undefined}
                aria-invalid={!!(phone && phone.replace(/\D/g, '').length < 11)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-2xl px-6 py-6 text-[20px] text-white outline-none transition-all placeholder:text-zinc-700" 
                value={phone} 
                onChange={e => onPhoneChange(e.target.value)} 
              />
              {phone && phone.replace(/\D/g, '').length < 11 && (
                <p id="phone-error-desktop" className="text-[11px] text-red-400/80" role="alert">Informe um WhatsApp válido</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-3">
        <label htmlFor="name-mobile" className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
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
          className="w-full bg-[#0d0d0d] border border-white/[0.06] focus:border-[#C5A059] focus:shadow-[0_0_16px_rgba(197,160,89,0.15)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600" 
          value={name} 
          onChange={e => onNameChange(e.target.value)} 
        />
        {name && name.trim().length < 3 && (
          <p id="name-error-mobile" className="text-[10px] text-red-400/80" role="alert">Mínimo 3 caracteres</p>
        )}
      </div>
      <div className="space-y-3">
        <label htmlFor="phone-mobile" className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#C5A059"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </label>
        <input 
          id="phone-mobile"
          type="tel" 
          placeholder="(00) 90000-0000" 
          aria-label="Seu número de WhatsApp com DDD"
          aria-describedby={phone && phone.replace(/\D/g, '').length < 11 ? 'phone-error-mobile' : undefined}
          aria-invalid={!!(phone && phone.replace(/\D/g, '').length < 11)}
          className="w-full bg-[#0d0d0d] border border-white/[0.06] focus:border-[#C5A059] focus:shadow-[0_0_16px_rgba(197,160,89,0.15)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600" 
          value={phone} 
          onChange={e => onPhoneChange(e.target.value)} 
        />
        {phone && phone.replace(/\D/g, '').length < 11 && (
          <p id="phone-error-mobile" className="text-[10px] text-red-400/80" role="alert">Informe um WhatsApp válido</p>
        )}
      </div>
    </div>
  );
});

DataStep.displayName = 'DataStep';

export default DataStep;
