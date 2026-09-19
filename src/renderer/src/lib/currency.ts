export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function centsToAmount(cents: number): number {
  return cents / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
