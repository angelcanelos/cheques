import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWindowsHtml, buildWindowsFontTestHtml } from '../src/shared/windowsLayout.ts'
import type { CalibrationSettings, CheckPrintData } from '../src/shared/types.ts'

const calibration: CalibrationSettings = {
  version: 10,
  pageWidthMm: 215.9,
  pageHeightMm: 203.8,
  printMode: 'windows',
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
  printLevel: 4,
  boldEnabled: true,
  windowsFont: 'arial',
  dateGapDayMonthMm: 5.6,
  dateGapMonthYearMm: 2.9,
  fields: {
    payeeName: { xMm: 7, yMm: 20, fontSizePt: 11, bold: true, align: 'left' },
    amountNumeric: { xMm: 151.2, yMm: 20.8, fontSizePt: 11, bold: true, align: 'center' },
    amountWords: { xMm: 7.4, yMm: 31.4, fontSizePt: 11, bold: true, align: 'left' },
    date: { xMm: 109.2, yMm: 5.6, fontSizePt: 11, bold: true, align: 'left' }
  }
}

const check: CheckPrintData = {
  payeeName: 'RICARDO SANCHEZ SARABIA',
  amountNumeric: '3,388.80',
  amountWords: 'SON:  ( TRES MIL TRESCIENTOS OCHENTA Y OCHO PESOS 80/100 M.N. )',
  day: '25',
  month: '09',
  year: '2026'
}

const pageCount = (html: string) => (html.match(/<div class="page">/g) ?? []).length

test('una tanda de 5 cheques se reparte en hojas A4 sin cortar ninguna línea', () => {
  const html = buildWindowsHtml(Array(5).fill(check), calibration)
  assert.equal(pageCount(html), 3) // 5 formas de 203.8 mm ocupan 3 hojas A4
  assert.equal((html.match(/RICARDO SANCHEZ SARABIA/g) ?? []).length, 5)
})

test('caben 10 cheques; el 11 cae en el borde de una hoja y se avisa antes de imprimir', () => {
  assert.doesNotThrow(() => buildWindowsHtml(Array(10).fill(check), calibration))
  assert.throws(() => buildWindowsHtml(Array(11).fill(check), calibration), /cheque 11/)
})

test('usa la letra elegida del catálogo (Arial, Cambria, Roboto…)', () => {
  assert.match(buildWindowsHtml([check], calibration), /font-family: Arial/)
  assert.match(buildWindowsHtml([check], { ...calibration, windowsFont: 'cambria' }), /font-family: Cambria/)
  assert.match(buildWindowsHtml([check], { ...calibration, windowsFont: 'roboto' }), /font-family: Roboto/)
})

test('el catálogo trae varias letras modernas y todas las incluidas tienen sus archivos', async () => {
  const { FONT_CATALOG } = await import('../src/shared/fonts.ts')
  const { existsSync } = await import('node:fs')
  assert.ok(FONT_CATALOG.length >= 15)
  for (const f of FONT_CATALOG.filter((x) => x.bundled)) {
    assert.ok(existsSync(`resources/fonts/${f.file}-400.woff2`), f.id + ' 400')
    assert.ok(existsSync(`resources/fonts/${f.file}-700.woff2`), f.id + ' 700')
  }
})

test('la intensidad engrosa el trazo de la letra', () => {
  assert.match(buildWindowsHtml([check], { ...calibration, printLevel: 4 }), /-webkit-text-stroke:0\.2pt/)
  assert.match(buildWindowsHtml([check], { ...calibration, printLevel: 1 }), /-webkit-text-stroke:0pt/)
})

test('el primer cheque queda en la posición calibrada más el ajuste de Windows', () => {
  const html = buildWindowsHtml([check], calibration)
  assert.match(html, /left:20\.4mm; top:26\.5mm/) // nombre: 7+13.4, 20+6.5
})

test('la hoja de prueba lleva una sola línea', () => {
  const html = buildWindowsFontTestHtml(calibration)
  assert.equal(pageCount(html), 1)
  assert.equal((html.match(/class="f"/g) ?? []).length, 1)
})

test('el ajuste de tandas baja los cheques solo cuando hay más de uno', () => {
  const one = buildWindowsHtml([check], { ...calibration, batchOffsetYMm: 1 })
  assert.match(one, /left:20\.4mm; top:26\.5mm/) // un cheque: sin cambio
  const many = buildWindowsHtml([check, check], { ...calibration, batchOffsetYMm: 1 })
  assert.match(many, /left:20\.4mm; top:27\.5mm/) // tanda: 1 mm más abajo
})
