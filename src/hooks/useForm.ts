import { useState, useCallback, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────

type ValidationRule<T> = {
  required?: boolean | string; // true = mensagem padrão, string = mensagem customizada
  pattern?: [RegExp, string]; // [regex, mensagem de erro]
  minLength?: [number, string]; // [tamanho mínimo, mensagem]
  maxLength?: [number, string]; // [tamanho máximo, mensagem]
  validate?: (value: T) => string | undefined | null; // validação customizada
};

type ValidationRules<T extends Record<string, unknown>> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

type FieldErrors<T> = Partial<Record<keyof T, string>>;

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  /** Função de validação customizada — recebe todos os valores e retorna erros por campo */
  validate?: (values: T) => Partial<Record<keyof T, string | undefined>>;
  onSubmit?: (values: T) => Promise<void> | void;
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Hook de formulário simplificado — reduz boilerplate de useState manual.
 *
 * Exemplo:
 * ```ts
 * const form = useForm({
 *   initialValues: { name: '', phone: '', email: '' },
 *   validationRules: {
 *     name: { required: 'Nome é obrigatório' },
 *     phone: { required: true, pattern: [/^\\d{10,11}$/, 'Telefone inválido'] },
 *   },
 *   onSubmit: async (values) => { await createClient(values); },
 * });
 *
 * // No JSX:
 * <input value={form.values.name} onChange={form.handleChange('name')} />
 * {form.errors.name && <span>{form.errors.name}</span>}
 * <button onClick={form.submit} disabled={form.isSubmitting}>
 *   {form.isSubmitting ? 'Salvando...' : 'Salvar'}
 * </button>
 * ```
 */
export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validationRules,
  validate: customValidate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Valida um campo específico
  const validateField = useCallback(
    (name: keyof T, value: T[keyof T]): string | undefined => {
      // Se tem função validate customizada, usa ela primeiro
      if (customValidate) {
        const allErrors = customValidate(values);
        const err = allErrors[name];
        if (err) return err;
      }

      const rules = validationRules?.[name];
      if (!rules) return undefined;

      const strValue = String(value ?? '');

      if (rules.required && !strValue.trim()) {
        return typeof rules.required === 'string'
          ? rules.required
          : `${String(name)} é obrigatório`;
      }

      if (rules.pattern && !rules.pattern[0].test(strValue)) {
        return rules.pattern[1];
      }

      if (rules.minLength && strValue.length < rules.minLength[0]) {
        return rules.minLength[1];
      }

      if (rules.maxLength && strValue.length > rules.maxLength[0]) {
        return rules.maxLength[1];
      }

      if (rules.validate) {
        return rules.validate(value) ?? undefined;
      }

      return undefined;
    },
    [validationRules, customValidate, values]
  );

  // Valida todos os campos
  const validateAll = useCallback((): boolean => {
    let newErrors: FieldErrors<T> = {};

    // Se tem função validate customizada, usa ela para validar TUDO
    if (customValidate) {
      const customErrors = customValidate(values);
      newErrors = Object.fromEntries(
        Object.entries(customErrors).filter(([, v]) => !!v)
      ) as FieldErrors<T>;
    }

    // Depois aplica validationRules (sobrescreve se houver conflito)
    if (validationRules) {
      for (const key of Object.keys(values) as Array<keyof T>) {
        const error = validateField(key, values[key]);
        if (error) {
          newErrors[key] = error;
        }
      }
    }

    const isValid = Object.keys(newErrors).length === 0;
    setErrors(newErrors);
    return isValid;
  }, [customValidate, validationRules, values, validateField]);

  // Altera um campo
  const handleChange = useCallback(
    (name: keyof T) => {
      return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const newValue = e.target.value as T[keyof T];
        setValues((prev) => ({ ...prev, [name]: newValue }));
        setIsDirty(true);

        // Valida apenas campos já tocados
        if (touched[name]) {
          const error = validateField(name, newValue);
          setErrors((prev) => {
            const next = { ...prev };
            if (error) {
              next[name] = error;
            } else {
              delete next[name];
            }
            return next;
          });
        }
      };
    },
    [touched, validateField]
  );

  // Define valor diretamente (para Select, Radio, etc.)
  const setValue = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      setIsDirty(true);

      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next[name] = error;
          } else {
            delete next[name];
          }
          return next;
        });
      }
    },
    [touched, validateField]
  );

  // Marca campo como tocado (ativa validação)
  const handleBlur = useCallback(
    (name: keyof T) => {
      return () => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, values[name]);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next[name] = error;
          } else {
            delete next[name];
          }
          return next;
        });
      };
    },
    [validateField, values]
  );

  // Reseta o formulário
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  // Submit
  const submit = useCallback(async () => {
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, onSubmit, values]);

  // Bind para passar diretamente pro input
  const bind = useCallback(
    (name: keyof T) => ({
      value: values[name],
      onChange: handleChange(name),
      onBlur: handleBlur(name),
      name: name as string,
    }),
    [values, handleChange, handleBlur]
  );

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid,
    handleChange,
    setValue,
    handleBlur,
    reset,
    submit,
    bind,
    setValues,
    setErrors,
  };
}
