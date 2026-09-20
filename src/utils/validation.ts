export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

export function isValidWhatsapp(whatsapp: string): boolean {
  const digits = whatsapp.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isValidPrice(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isValidDuration(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 5 && minutes <= 480;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}