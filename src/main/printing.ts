import { BrowserWindow } from 'electron'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { buildEscpJob, buildFontTestJob, encodeText } from '../shared/escp'
import { amountToPesosText } from '../shared/amountToWords'
import { formatCheckAmount, formatWordsLine, splitCheckDate } from '../shared/format'
import type {
  CalibrationSettings,
  CheckPrintData,
  FieldKey,
  PrintableCheck
} from '../shared/types'
import { sendRaw } from './rawPrinter'
import { fontFaceCss } from './fonts'
import { printWindowsHtml } from './windowsPrint'
import {
  boxStyle,
  buildWindowsFontTestHtml,
  buildWindowsHtml,
  fontFamily
} from '../shared/windowsLayout'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Convierte un cheque guardado en el texto exacto que se imprime en cada posición. */
export function toPrintData(check: PrintableCheck): CheckPrintData {
  const amount = check.amountCents / 100
  const date = splitCheckDate(check.checkDate)
  return {
    payeeName: check.workerName.toLocaleUpperCase('es-MX'),
    amountNumeric: formatCheckAmount(amount),
    // Siempre se recalcula con la regla vigente (p. ej. "UN MIL"), aunque se haya guardado antes.
    amountWords: formatWordsLine(amountToPesosText(amount)),
    day: date.day,
    month: date.month,
    year: date.year
  }
}

export const SAMPLE_CHECK: PrintableCheck = {
  workerName: 'NOMBRE DE PRUEBA',
  amountCents: 123450,
  amountWords: 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N.',
  checkDate: '2026-01-15'
}

function referenceImageDataUrl(calibration: CalibrationSettings): string | null {
  if (!calibration.referenceImagePath) return null
  try {
    const ext = extname(calibration.referenceImagePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    const base64 = readFileSync(calibration.referenceImagePath).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

/** HTML de una forma (un cheque) para la vista previa. `background` solo se usa ahí. */
function buildHtml(
  pages: CheckPrintData[],
  calibration: CalibrationSettings,
  background: string | null,
  extraCss = ''
): string {
  const pagesHtml = pages
    .map((data) => {
      const f = calibration.fields
      const dateHtml =
        `<span>${escapeHtml(data.day)}</span>` +
        `<span style="margin-left:${calibration.dateGapDayMonthMm}mm">${escapeHtml(data.month)}</span>` +
        `<span style="margin-left:${calibration.dateGapMonthYearMm}mm">${escapeHtml(data.year)}</span>`
      const box = (pos: CalibrationSettings['fields'][FieldKey], x: number, inner: string): string =>
        `<div class="f" style="${boxStyle(pos, calibration, x + calibration.offsetXMm, pos.yMm + calibration.offsetYMm)}">${inner}</div>`
      const fields =
        box(f.payeeName, f.payeeName.xMm, escapeHtml(data.payeeName)) +
        box(f.amountNumeric, f.amountNumeric.xMm, escapeHtml(data.amountNumeric)) +
        box(f.amountWords, f.amountWords.xMm, escapeHtml(data.amountWords)) +
        box({ ...f.date, align: 'left' }, f.date.xMm, dateHtml)
      const bg = background
        ? `<img src="${background}" style="position:absolute;left:0;top:0;width:100%;height:100%;opacity:.35" />`
        : ''
      return `<div class="page">${bg}${fields}</div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  ${extraCss}
  @page { size: ${calibration.pageWidthMm}mm ${calibration.pageHeightMm}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page { position: relative; width: ${calibration.pageWidthMm}mm; height: ${calibration.pageHeightMm}mm; overflow: hidden; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .f { position: absolute; white-space: pre; line-height: 1; color: #000; font-family: ${fontFamily(calibration)}; }
</style>
</head>
<body>${pagesHtml}</body>
</html>`
}

export function buildPreviewHtml(
  check: PrintableCheck,
  calibration: CalibrationSettings
): string {
  return buildHtml(
    [toPrintData(check)],
    calibration,
    referenceImageDataUrl(calibration),
    calibration.printMode === 'windows' ? fontFaceCss(calibration.windowsFont) : ''
  )
}

export function getReferenceImageDataUrl(calibration: CalibrationSettings): string | null {
  return referenceImageDataUrl(calibration)
}

/** Imprime los cheques en orden, uno por forma continua. */
export async function printChecks(
  checks: PrintableCheck[],
  calibration: CalibrationSettings
): Promise<void> {
  if (checks.length === 0) return
  const pages = checks.map((c) => toPrintData(c))

  if (calibration.printMode === 'escp') {
    if (!calibration.printerName) {
      throw new Error('Elige la impresora (por ejemplo la Epson LX) antes de imprimir.')
    }
    await sendRaw(calibration.printerName, buildEscpJob(pages, calibration))
    return
  }

  await printWindowsHtml(buildWindowsHtml(pages, calibration, fontFaceCss(calibration.windowsFont)), calibration)
}

export async function listPrinters(): Promise<{ name: string; displayName: string }[]> {
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadURL('data:text/html,<html></html>')
    const printers = await win.webContents.getPrintersAsync()
    return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name }))
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

/** Una sola línea de texto, sin avanzar formas: para comprobar la conexión sin gastar papel. */
export async function printQuickTest(printerName: string): Promise<void> {
  const bytes = Uint8Array.from([0x1b, 0x40, ...encodeText('PRUEBA - CHEQUES APP'), 0x0d, 0x0a])
  await sendRaw(printerName, bytes)
}

/** Una línea de prueba con la letra e intensidad actuales, sin gastar una forma completa. */
export async function printFontTest(calibration: CalibrationSettings): Promise<void> {
  if (calibration.printMode === 'windows') {
    await printWindowsHtml(
      buildWindowsFontTestHtml(calibration, fontFaceCss(calibration.windowsFont)),
      calibration
    )
    return
  }
  if (!calibration.printerName) throw new Error('Elige la impresora en Calibración o en Imprimir.')
  await sendRaw(calibration.printerName, buildFontTestJob(calibration))
}
