/** "2026-09-17" -> { day: "17", month: "09", year: "2026" } (cada parte se imprime en su propia posición). */
export function splitCheckDate(iso: string): { day: string; month: string; year: string } {
  const [year, month, day] = iso.split('-')
  return { day, month, year }
}

/** 2140.4 -> "2,140.40" (sin signo de pesos, como se escribe en el cheque). */
export function formatCheckAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/** Línea de la cantidad con letra, con el formato que usa la secretaria: SON:  ( ... ) */
export function formatWordsLine(words: string): string {
  return `SON:  ( ${words} )`
}
