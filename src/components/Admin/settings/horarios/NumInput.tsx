import { useState, useEffect, type FC } from 'react';
import { inputClass } from './types';

/**
 * Input numerico controlado que so valida no onBlur.
 * Enquanto digita, permite entrada livre; ao perder foco, aplica clamp + padStart.
 * Usado nos campos de hora (HH) e minuto (MM) dos horarios de funcionamento.
 */
const NumInput: FC<{ value: string; onChange: (v: string) => void; max: number }> = ({
  value,
  onChange,
  max,
}) => {
  const [local, setLocal] = useState(value);

  // Sincroniza se o valor externo mudar (ex: carregou dados novos)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = () => {
    const raw = local.replace(/\D/g, '').slice(0, 2);
    const clamped = String(Math.min(parseInt(raw || '0', 10), max)).padStart(2, '0');
    setLocal(clamped);
    onChange(clamped);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={local}
      onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').slice(0, 2))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={inputClass}
    />
  );
};

export default NumInput;
