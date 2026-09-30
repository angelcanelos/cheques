import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEscpJob, buildFontTestJob, encodeText } from '../src/shared/escp.ts'
import type { CalibrationSettings, CheckPrintData } from '../src/shared/types.ts'

const calibration: CalibrationSettings = {
  version: 10,
  pageWidthMm: 215.9,
  pageHeightMm: 279.4, // 11"
  printMode: 'escp',
  printerName: null,
  windowsPrinterName: null,
  driverPaper: 'A4',
  winOffsetXMm: 13.4,
  winOffsetYMm: 6.5,
  referenceImagePath: null,
  offsetXMm: 0,
  offsetYMm: 0,
  batchOffsetYMm: 0,
  rotateLandscape: false,
  printFont: 'sans',
  printLevel: 1,
  boldEnabled: true,
  windowsFont: 'arial',
  dateGapDayMonthMm: 3.6,
  dateGapMonthYearMm: 6.9,
  fields: {
    payeeName: { xMm: 25.4, yMm: 25.4, fontSizePt: 11, bold: false, align: 'left' },
    amountNumeric: { xMm: 127, yMm: 25.4, fontSizePt: 11, bold: false, align: 'center' },
    amountWords: { xMm: 25.4, yMm: 50.8, fontSizePt: 11, bold: false, align: 'left' },
    date: { xMm: 100, yMm: 12.7, fontSizePt: 11, bold: true, align: 'left' }
  }
}

const check: CheckPrintData = {
  payeeName: 'JOSÉ NÚÑEZ',
  amountNumeric: '1,234.50',
  amountWords: 'SON:  ( UN MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N. )',
  day: '23',
  month: '09',
  year: '2026'
}

/** Suma todo lo que avanza el papel (ESC J n) en 1/216". */
function totalFeed(bytes: Uint8Array): number {
  let total = 0
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x1b && bytes[i + 1] === 0x4a) total += bytes[i + 2]
  }
  return total
}

test('el trabajo empieza reiniciando la impresora (ESC @)', () => {
  const job = buildEscpJob([check], calibration)
  assert.deepEqual([...job.slice(0, 2)], [0x1b, 0x40])
})

test('Ñ se conserva (0xA5) y los acentos se quitan', () => {
  assert.deepEqual(encodeText('JOSÉ NÚÑEZ'), [...'JOSE NU'].map((c) => c.charCodeAt(0)).concat([0xa5]).concat([...'EZ'].map((c) => c.charCodeAt(0))))
})

test('posición horizontal absoluta: 25.4 mm = 60/60" -> ESC $ 60 0', () => {
  const job = [...buildEscpJob([check], calibration)]
  const found = job.some((b, i) => b === 0x1b && job[i + 1] === 0x24 && job[i + 2] === 60 && job[i + 3] === 0)
  assert.ok(found)
})

test('cada cheque avanza exactamente el largo de la forma (sin acumular error)', () => {
  const formUnits = (279.4 / 25.4) * 216 // 2376
  for (const n of [1, 2, 3, 10]) {
    const job = buildEscpJob(Array(n).fill(check), calibration)
    assert.equal(totalFeed(job), Math.round(n * formUnits))
  }
})

test('el redondeo no se acumula con un largo que no es múltiplo exacto', () => {
  const odd = { ...calibration, pageHeightMm: 235.3 }
  const formUnits = (235.3 / 25.4) * 216
  const job = buildEscpJob(Array(25).fill(check), odd)
  assert.equal(totalFeed(job), Math.round(25 * formUnits))
})

test('los datos se imprimen ordenados de arriba hacia abajo', () => {
  const job = buildEscpJob([check], calibration)
  const text = Buffer.from(job).toString('latin1')
  assert.ok(text.indexOf('2026') < text.indexOf('1,234.50'))
  assert.ok(text.indexOf('1,234.50') < text.indexOf('MIL DOSCIENTOS'))
})

test('la fecha es un conjunto: día, mes y año en la misma línea con las separaciones indicadas', () => {
  const job = [...buildEscpJob([check], calibration)]
  // día en x=100; mes en 100 + 5.08 + 3.6; año en mes + 5.08 + 6.9
  const monthX = 100 + 2 * 2.54 + 3.6
  const yearX = monthX + 2 * 2.54 + 6.9
  const units = (mm: number) => Math.round((mm / 25.4) * 60)
  const has = (n: number) =>
    job.some((b, i) => b === 0x1b && job[i + 1] === 0x24 && job[i + 2] === (n & 0xff) && job[i + 3] === n >> 8)
  assert.ok(has(units(100)) && has(units(monthX)) && has(units(yearX)))
})

test('usa letra Sans Serif NLQ y refuerzo (resaltado + doble golpe) desde el nivel 2', () => {
  const job = [...buildEscpJob([check], { ...calibration, printLevel: 2 })]
  const seq = (...bytes: number[]) => job.some((_, i) => bytes.every((v, k) => job[i + k] === v))
  assert.ok(seq(0x1b, 0x78, 0x01, 0x1b, 0x6b, 0x01)) // NLQ + Sans Serif
  assert.ok(seq(0x1b, 0x45, 0x1b, 0x47)) // negrita
})

test('texto alineado a la derecha termina en la posición indicada', () => {
  // "SON..." no aplica: el monto va centrado en 127 mm.
  const job = [...buildEscpJob([check], calibration)]
  const text = check.amountNumeric
  const expected = Math.round(((127 - (text.length * 2.54) / 2) / 25.4) * 60)
  const found = job.some(
    (b, i) => b === 0x1b && job[i + 1] === 0x24 && job[i + 2] === (expected & 0xff) && job[i + 3] === (expected >> 8)
  )
  assert.ok(found)
})

test('la intensidad "más oscura" marca cada texto dos veces, en un solo sentido de impresión', () => {
  const normal = [...buildEscpJob([check], calibration)]
  const dark = [...buildEscpJob([check], { ...calibration, printLevel: 4 })]
  const count = (arr: number[], needle: number[]) =>
    arr.filter((_, i) => needle.every((v, k) => arr[i + k] === v)).length
  const yearBytes = [...'2026'].map((c) => c.charCodeAt(0))
  assert.equal(count(dark, yearBytes), 2 * count(normal, yearBytes))
  assert.ok(count(dark, [0x1b, 0x55, 0x01]) === 1) // impresión unidireccional
  assert.ok(count(normal, [0x1b, 0x55, 0x01]) === 0)
})

test('la sobreimpresión no cambia cuánto avanza el papel', () => {
  const total = (b: Uint8Array) => {
    let t = 0
    for (let i = 0; i < b.length - 2; i++) if (b[i] === 0x1b && b[i + 1] === 0x4a) t += b[i + 2]
    return t
  }
  assert.equal(
    total(buildEscpJob([check, check], calibration)),
    total(buildEscpJob([check, check], { ...calibration, printLevel: 5 }))
  )
})

test('la letra Roman selecciona NLQ Roman y la línea de prueba no avanza formas', () => {
  const job = buildFontTestJob({ ...calibration, printFont: 'roman' })
  const arr = [...job]
  assert.ok(arr.some((_, i) => [0x1b, 0x78, 0x01, 0x1b, 0x6b, 0x00].every((v, k) => arr[i + k] === v)))
})

test('el nivel intermedio (3) da dos pasadas: la primera con refuerzo y la segunda ligera', () => {
  const job = [...buildEscpJob([check], { ...calibration, printLevel: 3 })]
  const count = (needle: number[]) => job.filter((_, i) => needle.every((v, k) => job[i + k] === v)).length
  const yearBytes = [...'2026'].map((c) => c.charCodeAt(0))
  const texts = count(yearBytes)
  assert.equal(texts, 2) // dos pasadas
  const emphasized = count([0x1b, 0x45, 0x1b, 0x47])
  const textPieces = 6 // nombre, monto, letras, día, mes, año
  assert.equal(emphasized, textPieces) // solo la primera pasada de cada texto lleva refuerzo
})

test('los niveles 1 a 5 usan 1, 1, 2, 2 y 3 pasadas', () => {
  const passes = (level: 1 | 2 | 3 | 4 | 5) => {
    const job = [...buildEscpJob([check], { ...calibration, printLevel: level })]
    const year = [...'2026'].map((c) => c.charCodeAt(0))
    return job.filter((_, i) => year.every((v, k) => job[i + k] === v)).length
  }
  assert.deepEqual([1, 2, 3, 4, 5].map((l) => passes(l as 1 | 2 | 3 | 4 | 5)), [1, 1, 2, 2, 3])
})

test('el ajuste de tandas mueve todo el cheque en tandas, pero no en un cheque solo ni cambia el avance total', () => {
  const feedBeforeFirstText = (b: Uint8Array) => {
    let total = 0
    for (let i = 0; i < b.length - 2; i++) {
      if (b[i] === 0x1b && b[i + 1] === 0x24) return total // ESC $ = primer texto
      if (b[i] === 0x1b && b[i + 1] === 0x4a) total += b[i + 2]
    }
    return total
  }
  const withBatch = { ...calibration, batchOffsetYMm: 2 }
  const single0 = buildEscpJob([check], calibration)
  const single2 = buildEscpJob([check], withBatch)
  assert.equal(feedBeforeFirstText(single2), feedBeforeFirstText(single0)) // un solo cheque: sin cambio
  const batch0 = buildEscpJob([check, check], calibration)
  const batch2 = buildEscpJob([check, check], withBatch)
  assert.equal(feedBeforeFirstText(batch2) - feedBeforeFirstText(batch0), Math.round((2 / 25.4) * 216))
  assert.equal(totalFeed(batch2), totalFeed(batch0)) // la separación entre cheques no cambia
})
