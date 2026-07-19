export const maskName = (name: string | null | undefined): string => {
  if (!name) return '';
  if (name === 'BLOQUEADO') return name;
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      if (part.length === 2) return part[0] + '*';
      return part.slice(0, 1) + '*'.repeat(part.length - 1);
    })
    .join(' ');
};

export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!user || !domain) return '***@***.com';
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
};

/**
 * Returns first name + last name only (e.g. "Felipe Silva Figueiredo" → "Felipe Figueiredo").
 * If name has 1 or 2 words, returns as-is.
 */
export const formatDisplayName = (name: string | null | undefined): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
};
