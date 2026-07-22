import { useState, useEffect, type FC } from 'react';
import { useBarberSettings } from '../../../contexts/BarberSettingsContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { formatPhone } from '../../../lib/utils';
import PhotoSection from './conta/PhotoSection';
import EditableField from './conta/EditableField';
import MobileEditScreen from './MobileEditScreen';

/* ─── Configuracao da conta do barbeiro ───
 * Campos editaveis: nome (max 8), WhatsApp, bio (max 200), frase (max 80), Instagram.
 * Desktop: inline edit. Mobile: tela cheia via MobileEditScreen.
 * Foto: upload com redimensionamento automatico para WebP. */

const MAX = { name: 8, bio: 200, quote: 80, instagram: 30 };

const SettingsConta: FC = () => {
  const settings = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();

  // Estado reativo sincronizado com o context
  const [vals, setVals] = useState({
    name: settings.barberName,
    phone: settings.barberPhone,
    bio: settings.barberBio,
    quote: settings.barberQuote,
    instagram: settings.barberInstagram,
  });
  // Sync form state when settings load from context
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVals({
      name: settings.barberName,
      phone: settings.barberPhone,
      bio: settings.barberBio,
      quote: settings.barberQuote,
      instagram: settings.barberInstagram,
    });
  }, [
    settings.barberName,
    settings.barberPhone,
    settings.barberBio,
    settings.barberQuote,
    settings.barberInstagram,
  ]);

  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const startEdit = (field: string) => {
    setInputs((prev) => ({ ...prev, [field]: vals[field as keyof typeof vals] || '' }));
    setEditing((prev) => ({ ...prev, [field]: true }));
  };
  const cancelEdit = (field: string) => setEditing((prev) => ({ ...prev, [field]: false }));
  const setInput = (field: string, value: string) =>
    setInputs((prev) => ({ ...prev, [field]: value }));

  // Salva um campo especifico com validacao
  const saveField = async (field: string) => {
    const value = (inputs[field] || '').trim();
    let ok = true; // Assume sucesso ate que uma operacao falhe

    switch (field) {
      case 'name':
        if (value.length > MAX.name) {
          showError(`Máximo de ${MAX.name} caracteres`);
          return;
        }
        if (!value) return;
        ok = await settings.updateBarberName(value);
        if (ok) showSuccess('Nome alterado!');
        break;
      case 'phone': {
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 10) {
          const ddd = parseInt(digits.slice(0, 2), 10);
          if (ddd < 11 || ddd > 99) {
            showError('DDD inválido.');
            return;
          }
          ok = await settings.updateBarberPhone(digits);
          if (ok) {
            showSuccess('Telefone alterado!');
            setTimeout(() => setInput('phone', digits), 100);
          }
        }
        break;
      }
      case 'bio':
        if (value.length > MAX.bio) {
          showError(`Máximo de ${MAX.bio} caracteres`);
          return;
        }
        ok = await settings.updateBarberBio(value);
        if (ok) showSuccess('Bio alterada!');
        break;
      case 'quote':
        if (value.length > MAX.quote) {
          showError(`Máximo de ${MAX.quote} caracteres`);
          return;
        }
        ok = await settings.updateBarberQuote(value);
        if (ok) showSuccess('Frase alterada!');
        break;
      case 'instagram': {
        const cleaned = value.replace(/^@/, '').trim();
        if (cleaned.length > MAX.instagram) {
          showError(`Máximo de ${MAX.instagram} caracteres`);
          return;
        }
        ok = await settings.updateBarberInstagram(cleaned);
        if (ok) showSuccess('Instagram alterado!');
        break;
      }
    }
    if (!ok) showError('Erro ao salvar');
    else setEditing((prev) => ({ ...prev, [field]: false }));
  };

  const canSave = (field: string) => {
    const val = (inputs[field] || '').trim();
    const current = vals[field as keyof typeof vals] || '';
    switch (field) {
      case 'name':
        return !!val;
      case 'phone':
        return val.replace(/\D/g, '').length >= 10 && val.replace(/\D/g, '') !== current;
      case 'bio':
        return val !== current;
      case 'quote':
        return val !== current;
      case 'instagram':
        return val.replace(/^@/, '').trim() !== current;
      default:
        return false;
    }
  };

  interface FieldConfig {
    field: string;
    label: string;
    placeholder: string;
    display: string;
    type: string;
    inputProps: Record<string, unknown>;
    helper: string;
    onChange?: (v: string) => string;
  }

  const fields: FieldConfig[] = [
    {
      field: 'name',
      label: 'Nome',
      placeholder: 'Seu nome',
      display: vals.name,
      type: 'text',
      inputProps: { maxLength: MAX.name },
      helper: `${(inputs.name || '').length}/${MAX.name}`,
    },
    {
      field: 'phone',
      label: 'WhatsApp',
      placeholder: '(00) 00000-0000',
      display: vals.phone ? formatPhone(vals.phone) : '',
      type: 'tel',
      inputProps: { maxLength: 15 },
      onChange: (v: string) => formatPhone(v),
      helper: `${(inputs.phone || '').replace(/\D/g, '').length}/11`,
    },
    {
      field: 'bio',
      label: 'Bio',
      placeholder: 'Adicione uma bio para o site...',
      display: vals.bio,
      type: 'textarea',
      inputProps: { maxLength: MAX.bio, rows: 3 },
      helper: `${(inputs.bio || '').length}/${MAX.bio}`,
    },
    {
      field: 'quote',
      label: 'Frase',
      placeholder: '"Não sou o melhor, mas sou o melhor para você."',
      display: vals.quote,
      type: 'text',
      inputProps: { maxLength: MAX.quote },
      helper: `${(inputs.quote || '').length}/${MAX.quote}`,
    },
    {
      field: 'instagram',
      label: 'Instagram',
      placeholder: '@seuusuario',
      display: vals.instagram ? `@${vals.instagram}` : '',
      type: 'text',
      inputProps: { maxLength: MAX.instagram + 1 },
      onChange: (v: string) =>
        v.replace(/^@/, '').length <= MAX.instagram ? v : inputs.instagram || '',
      helper: `${(inputs.instagram || '').replace(/^@/, '').length}/${MAX.instagram}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="w-full space-y-4">
        <PhotoSection />

        {fields.map((f) => (
          <EditableField
            key={f.field}
            label={f.label}
            value={inputs[f.field] ?? vals[f.field as keyof typeof vals] ?? ''}
            displayValue={f.display}
            placeholder={f.placeholder}
            isEditing={!!editing[f.field]}
            setIsEditing={() => startEdit(f.field)}
            canSave={canSave(f.field)}
            onSave={() => saveField(f.field)}
            onCancel={() => cancelEdit(f.field)}
            MobileEditScreen={MobileEditScreen}
            mobileHelper={f.helper}
            renderInput={(ref) =>
              f.type === 'textarea' ? (
                <textarea
                  ref={ref as React.RefObject<HTMLTextAreaElement>}
                  value={inputs[f.field] ?? ''}
                  onChange={(e) => setInput(f.field, e.target.value.slice(0, MAX.bio))}
                  placeholder={f.placeholder}
                  rows={3}
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveField(f.field);
                    }
                    if (e.key === 'Escape') cancelEdit(f.field);
                  }}
                />
              ) : (
                <input
                  ref={ref as React.RefObject<HTMLInputElement>}
                  type={f.type}
                  value={inputs[f.field] ?? ''}
                  onChange={(e) =>
                    setInput(
                      f.field,
                      f.onChange ? f.onChange(e.target.value) : e.target.value.slice(0, MAX.name)
                    )
                  }
                  placeholder={f.placeholder}
                  {...f.inputProps}
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 tabular-nums"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField(f.field);
                    if (e.key === 'Escape') cancelEdit(f.field);
                  }}
                />
              )
            }
            renderMobileInput={(ref) =>
              f.type === 'textarea' ? (
                <textarea
                  ref={ref as React.RefObject<HTMLTextAreaElement>}
                  value={inputs[f.field] ?? ''}
                  onChange={(e) => setInput(f.field, e.target.value.slice(0, MAX.bio))}
                  placeholder={f.placeholder}
                  rows={4}
                  maxLength={MAX.bio}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 resize-none"
                />
              ) : (
                <input
                  ref={ref as React.RefObject<HTMLInputElement>}
                  type={f.type}
                  value={inputs[f.field] ?? ''}
                  onChange={(e) =>
                    setInput(
                      f.field,
                      f.onChange ? f.onChange(e.target.value) : e.target.value.slice(0, MAX.name)
                    )
                  }
                  placeholder={f.placeholder}
                  {...f.inputProps}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 tabular-nums"
                />
              )
            }
          />
        ))}
      </div>
      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsConta;
