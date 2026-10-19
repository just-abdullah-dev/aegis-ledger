import { Currency, CURRENCY_RATES } from '../types/ledger';

export function formatCurrency(amountUSD: number, currency: Currency = 'USD', compact = false): string {
  const { rate, symbol } = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const converted = amountUSD * rate;

  if (compact && Math.abs(converted) >= 1_000_000) {
    return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(converted) >= 1_000) {
    return `${symbol}${(converted / 1_000).toFixed(1)}k`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function generateCorrelationId(): string {
  const hex = Math.random().toString(16).substring(2, 10);
  return `corr-${hex}`;
}

export function generateIdempotencyKey(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `idem-${s4()}${s4()}-${s4()}-4${s4().substr(0, 3)}-${s4()}-${s4()}${s4()}${s4()}`;
}

export function incrementRowVersion(hexVersion: string): string {
  try {
    const clean = hexVersion.replace(/^0x/, '');
    const num = BigInt(`0x${clean}`);
    const next = num + 1n;
    return '0x' + next.toString(16).toUpperCase().padStart(16, '0');
  } catch {
    return '0x00000000000007E0';
  }
}

export function formatCountdown(expiryMs: number): { text: string; isExpired: boolean; urgency: 'normal' | 'warn' | 'critical' } {
  const diff = expiryMs - Date.now();
  if (diff <= 0) {
    return { text: 'Expired', isExpired: true, urgency: 'critical' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const text = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

  if (hours === 0 && minutes < 30) {
    return { text, isExpired: false, urgency: 'critical' };
  }
  if (hours < 2) {
    return { text, isExpired: false, urgency: 'warn' };
  }
  return { text, isExpired: false, urgency: 'normal' };
}
