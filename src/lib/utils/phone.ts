export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  const sliceStart = cleaned.length >= 11 ? cleaned.length - 11 : 0;
  const local = cleaned.slice(sliceStart);
  if (local.length >= 2) {
    return `(${local.slice(0, 2)}) 9****-****`;
  }
  return '(**) *****-****';
};

export const formatPhone = (value: string | undefined | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  let d = digits;
  if (d.length > 11) d = d.slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
