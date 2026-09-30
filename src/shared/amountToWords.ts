/**
 * Convierte un monto en pesos mexicanos a su representación en letras, tal
 * como se escribe en un cheque: "MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N."
 */

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
  'VEINTIUNO',
  'VEINTIDÓS',
  'VEINTITRÉS',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISÉIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE'
]

const DECENAS: Record<number, string> = {
  3: 'TREINTA',
  4: 'CUARENTA',
  5: 'CINCUENTA',
  6: 'SESENTA',
  7: 'SETENTA',
  8: 'OCHENTA',
  9: 'NOVENTA'
}

const CENTENAS: Record<number, string> = {
  1: 'CIENTO',
  2: 'DOSCIENTOS',
  3: 'TRESCIENTOS',
  4: 'CUATROCIENTOS',
  5: 'QUINIENTOS',
  6: 'SEISCIENTOS',
  7: 'SETECIENTOS',
  8: 'OCHOCIENTOS',
  9: 'NOVECIENTOS'
}

function convertGroup(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  if (n < 30) return UNIDADES[n]

  const centena = Math.floor(n / 100)
  const resto = n % 100

  const parts: string[] = []
  if (centena > 0) parts.push(CENTENAS[centena])

  if (resto > 0) {
    if (resto < 30) {
      parts.push(UNIDADES[resto])
    } else {
      const decena = Math.floor(resto / 10)
      const unidad = resto % 10
      const decenaWord = DECENAS[decena]
      parts.push(unidad > 0 ? `${decenaWord} Y ${UNIDADES[unidad]}` : decenaWord)
    }
  }

  return parts.join(' ')
}

function convertInteger(n: number): string {
  if (n === 0) return 'CERO'

  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000

  const parts: string[] = []
  if (millones > 0) {
    parts.push(millones === 1 ? 'UN MILLÓN' : `${convertGroup(millones)} MILLONES`)
  }
  if (miles > 0) {
    // En los cheques se escribe "UN MIL" (1,000-1,999), no solo "MIL".
    parts.push(`${miles === 1 ? 'UN' : convertGroup(miles)} MIL`)
  }
  if (resto > 0) {
    parts.push(convertGroup(resto))
  }

  return parts.join(' ')
}

/** Aplica la apócope de "uno" -> "un" frente al sustantivo masculino "pesos"
 * (treinta y uno -> treinta y un, veintiuno -> veintiún). */
function applyUnoApocope(words: string): string {
  if (words.endsWith('VEINTIUNO')) {
    return words.slice(0, -3) + 'ÚN'
  }
  if (words.endsWith(' UNO')) {
    return words.slice(0, -3) + 'UN'
  }
  return words
}

export function amountToPesosText(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const pesos = Math.floor(rounded)
  const centavos = Math.round((rounded - pesos) * 100)

  const pesosTexto = pesos === 1 ? 'UN PESO' : `${applyUnoApocope(convertInteger(pesos))} PESOS`

  return `${pesosTexto} ${String(centavos).padStart(2, '0')}/100 M.N.`
}
