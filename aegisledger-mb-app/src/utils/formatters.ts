export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  isPrivacyMode: boolean = false
): string {
  if (isPrivacyMode) {
    return '••••••••';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function formatCompactCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'PKR' ? '₨' : '$';
  if (Math.abs(amount) >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}k`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '••••';
  const parts = accountNumber.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-•••${parts[1].slice(-3)}-${parts[2]}`;
  }
  return accountNumber.length > 4 ? `•••• ${accountNumber.slice(-4)}` : accountNumber;
}

export function formatTimestamp(timestamp: string | number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(timestamp);
  }
}

export function formatCountdown(expiresAtEpochMs: number): string {
  const diff = expiresAtEpochMs - Date.now();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}
