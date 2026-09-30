/**
 * Generador de trabajos ESC/P para impresoras matriciales Epson (LX-250/LX-350, etc.)
 * con forma continua. Cada cheque ocupa UNA forma; el papel avanza exactamente el
 * largo de la forma entre cheques (acumulando el redondeo para que no se desfase).
 */
import type { CalibrationSettings, CheckPrintData, FieldPosition, PrintLevel } from './types'

const ESC = 0x1b
const V_UNITS_PER_INCH = 216 // ESC J avanza en 1/216"
const H_UNITS_PER_INCH = 60 // ESC $ posiciona en 1/60"

/** Texto -> bytes de la tabla PC437 (conserva Ñ/ñ, quita acentos, lo demás ASCII). */
export function encodeText(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    if (ch === 'Ñ') out.push(0xa5)
    else if (ch === 'ñ') out.push(0xa4)
    else {
      const base = ch.normalize('NFD')[0]
      const code = base.charCodeAt(0)
      if (code >= 0x20 && code <= 0x7e) out.push(code)
      else if (ch === ' ') out.push(0x20)
      else out.push(0x3f)
    }
  }
  return out
}

/** Comando de paso de letra y ancho (mm) de cada carácter según el tamaño elegido. */
function pitch(fontSizePt: number): { command: number[]; charWidthMm: number } {
  if (fontSizePt >= 11) return { command: [ESC, 0x50, 0x12], charWidthMm: 25.4 / 10 } // 10 cpi
  if (fontSizePt >= 9) return { command: [ESC, 0x4d, 0x12], charWidthMm: 25.4 / 12 } // 12 cpi
  return { command: [ESC, 0x50, 0x0f], charWidthMm: 25.4 / 17.14 } // 17 cpi condensado
}

function feed(units: number): number[] {
  const out: number[] = []
  let remaining = Math.round(units)
  while (remaining > 0) {
    const chunk = Math.min(remaining, 255)
    out.push(ESC, 0x4a, chunk)
    remaining -= chunk
  }
  return out
}

interface Item {
  pos: FieldPosition
  text: string
  pitchCommand: number[]
  v: number
  h: number
}

function makeItem(
  text: string,
  pos: FieldPosition,
  xMm: number,
  calibration: CalibrationSettings,
  align: FieldPosition['align'] = 'left'
): Item {
  const p = pitch(pos.fontSizePt)
  const width = text.length * p.charWidthMm
  const shift = align === 'center' ? width / 2 : align === 'right' ? width : 0
  return {
    pos,
    text,
    pitchCommand: p.command,
    v: Math.round(((pos.yMm + calibration.offsetYMm) / 25.4) * V_UNITS_PER_INCH),
    h: Math.round(((xMm + calibration.offsetXMm - shift) / 25.4) * H_UNITS_PER_INCH)
  }
}

/** Todas las piezas de texto de un cheque con su posición; la fecha son tres piezas en la misma línea. */
export function layoutItems(check: CheckPrintData, calibration: CalibrationSettings): Item[] {
  const f = calibration.fields
  const items = [
    makeItem(check.payeeName, f.payeeName, f.payeeName.xMm, calibration, f.payeeName.align),
    makeItem(check.amountNumeric, f.amountNumeric, f.amountNumeric.xMm, calibration, f.amountNumeric.align),
    makeItem(check.amountWords, f.amountWords, f.amountWords.xMm, calibration, f.amountWords.align)
  ]
  const charW = pitch(f.date.fontSizePt).charWidthMm
  const dayX = f.date.xMm
  const monthX = dayX + check.day.length * charW + calibration.dateGapDayMonthMm
  const yearX = monthX + check.month.length * charW + calibration.dateGapMonthYearMm
  items.push(
    makeItem(check.day, f.date, dayX, calibration),
    makeItem(check.month, f.date, monthX, calibration),
    makeItem(check.year, f.date, yearX, calibration)
  )
  return items
}

/**
 * Pasadas de cada texto según el nivel; cada una indica si lleva refuerzo (resaltado + doble golpe).
 * 1 normal · 2 oscura · 3 intermedia (2.ª pasada ligera) · 4 más oscura · 5 máxima.
 */
export function passPlan(level: PrintLevel): boolean[] {
  return {
    1: [false],
    2: [true],
    3: [true, false],
    4: [true, true],
    5: [true, true, true]
  }[level]
}

/** Comandos iniciales: reinicio, tabla de caracteres, letra y (si hace falta) impresión en un solo sentido. */
function header(calibration: CalibrationSettings): number[] {
  const bytes: number[] = [
    ESC, 0x40, // reinicia la impresora
    ESC, 0x74, 0x01, // tabla de caracteres PC437 (Ñ = 0xA5)
    ESC, 0x52, 0x00 // conjunto internacional USA
  ]
  // Letra: NLQ Roman (con patines, la más parecida a Cambria), NLQ Sans Serif o borrador.
  if (calibration.printFont === 'draft') bytes.push(ESC, 0x78, 0x00)
  else bytes.push(ESC, 0x78, 0x01, ESC, 0x6b, calibration.printFont === 'roman' ? 0x00 : 0x01)
  // Al sobreimprimir, un solo sentido de impresión evita que las pasadas se desalineen.
  if (passPlan(calibration.printLevel).length > 1) bytes.push(ESC, 0x55, 0x01)
  return bytes
}

/** Escribe un texto en una posición horizontal, con la intensidad elegida. */
function writeText(item: { pos: FieldPosition; text: string; pitchCommand: number[]; h: number }, calibration: CalibrationSettings): number[] {
  const out: number[] = []
  const h = Math.max(0, item.h)
  for (const emphasis of passPlan(calibration.printLevel)) {
    out.push(ESC, 0x24, h & 0xff, (h >> 8) & 0xff)
    out.push(...item.pitchCommand)
    // Refuerzo: resaltado + doble golpe, para que marque más oscuro.
    // Con boldEnabled = false se conservan las pasadas (oscuridad) pero sin énfasis (letra fina).
    const useEmphasis = emphasis && calibration.boldEnabled
    if (useEmphasis) out.push(ESC, 0x45, ESC, 0x47)
    out.push(...encodeText(item.text))
    if (useEmphasis) out.push(ESC, 0x46, ESC, 0x48)
  }
  return out
}

/** Una sola línea de prueba con la letra e intensidad actuales (no avanza formas). */
export function buildFontTestJob(calibration: CalibrationSettings): Uint8Array {
  const pos = calibration.fields.payeeName
  const item = makeItem('RICARDO SANCHEZ SARABIA     3,388.80', pos, 10, calibration)
  return Uint8Array.from([...header(calibration), ...writeText(item, calibration), 0x0d, 0x0a, 0x0d, 0x0a])
}

export function buildEscpJob(checks: CheckPrintData[], base: CalibrationSettings): Uint8Array {
  // En tandas (varios cheques) se suma el ajuste vertical propio de las tandas.
  const calibration =
    checks.length > 1 ? { ...base, offsetYMm: base.offsetYMm + base.batchOffsetYMm } : base
  const bytes: number[] = header(calibration)

  const formUnits = (calibration.pageHeightMm / 25.4) * V_UNITS_PER_INCH
  let currentV = 0

  checks.forEach((check, index) => {
    const pageStart = Math.round(index * formUnits)
    const nextStart = Math.round((index + 1) * formUnits)

    const items = layoutItems(check, calibration)
      .filter((item) => item.text.trim() !== '')
      .sort((a, b) => a.v - b.v || a.h - b.h)

    for (const item of items) {
      const target = Math.min(pageStart + Math.max(0, item.v), nextStart - 1)
      if (target > currentV) {
        bytes.push(...feed(target - currentV))
        currentV = target
      }
      bytes.push(...writeText(item, calibration))
    }

    if (nextStart > currentV) {
      bytes.push(...feed(nextStart - currentV))
      currentV = nextStart
    }
  })

  return Uint8Array.from(bytes)
}
