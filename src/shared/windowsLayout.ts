import { fontStack } from './fonts.ts'
import type { CalibrationSettings, CheckPrintData, FieldPosition } from './types'

/**
 * Impresión "gráfica" por el driver de Windows (letra Arial/Cambria de la computadora).
 *
 * El driver de la Epson LX-350 solo ofrece hojas Carta y A4, y en cada hoja avanza el papel
 * exactamente su largo. Los cheques miden `pageHeightMm` (203.8 mm), así que se acomodan en
 * una "tira" continua con un cheque cada `pageHeightMm` y se reparte en hojas del driver.
 * Es la misma idea del Excel de la secretaria (varios cheques por hoja A4).
 */
export const PAPERS = {
  A4: { name: 'A4', widthMm: 210, feedMm: 296.9, cssHeightMm: 296 },
  Letter: { name: 'Letter', widthMm: 215.9, feedMm: 279.4, cssHeightMm: 278.5 }
} as const

/** Franja de cada hoja donde el driver no imprime (arriba y abajo). */
const EDGE_GUARD_MM = 4

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function fontFamily(calibration: CalibrationSettings): string {
  if (calibration.printMode === 'windows') return fontStack(calibration.windowsFont)
  if (calibration.printFont === 'roman') return "Cambria, 'Times New Roman', serif"
  if (calibration.printFont === 'draft') return "'Courier New', monospace"
  return "Arial, 'Helvetica Neue', Helvetica, sans-serif"
}

/** Grosor extra del trazo: en una matricial, más trazo = más puntos = letra más oscura. */
export function strokePt(calibration: CalibrationSettings): number {
  return [0, 0, 0.1, 0.2, 0.4][calibration.printLevel - 1]
}

export function boxStyle(pos: FieldPosition, calibration: CalibrationSettings, xMm: number, yMm: number): string {
  const bold = calibration.boldEnabled && calibration.printLevel >= 2
  const shift = pos.align === 'center' ? '-50%' : pos.align === 'right' ? '-100%' : '0'
  return (
    `left:${xMm}mm; top:${yMm}mm; font-size:${pos.fontSizePt}pt; ` +
    `font-weight:${bold ? 'bold' : 'normal'}; transform:translateX(${shift}); ` +
    `-webkit-text-stroke:${strokePt(calibration)}pt #000;`
  )
}

function wrapDocument(pagesHtml: string, calibration: CalibrationSettings, extraCss = ''): string {
  const paper = PAPERS[calibration.driverPaper]
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><style>
  ${extraCss}
  @page { size: ${paper.name}; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page { position: relative; width: ${paper.widthMm}mm; height: ${paper.cssHeightMm}mm; overflow: hidden; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .f { position: absolute; white-space: pre; line-height: 1; color: #000; font-family: ${fontFamily(calibration)}; }
</style></head><body>${pagesHtml}</body></html>`
}

/** Reparte los cheques en hojas del driver. Lanza un error si alguna línea cae en el borde de una hoja. */
export function buildWindowsHtml(
  checks: CheckPrintData[],
  calibration: CalibrationSettings,
  extraCss = ''
): string {
  const paper = PAPERS[calibration.driverPaper]
  const feed = paper.feedMm
  const pages: string[][] = []
  const f = calibration.fields
  const dx = calibration.offsetXMm + calibration.winOffsetXMm
  // En tandas (varios cheques) se suma el ajuste vertical propio de las tandas.
  const dy =
    calibration.offsetYMm + calibration.winOffsetYMm + (checks.length > 1 ? calibration.batchOffsetYMm : 0)

  checks.forEach((c, k) => {
    const dateHtml =
      `<span>${escapeHtml(c.day)}</span>` +
      `<span style="margin-left:${calibration.dateGapDayMonthMm}mm">${escapeHtml(c.month)}</span>` +
      `<span style="margin-left:${calibration.dateGapMonthYearMm}mm">${escapeHtml(c.year)}</span>`
    const lines: { pos: FieldPosition; x: number; html: string }[] = [
      { pos: f.payeeName, x: f.payeeName.xMm, html: escapeHtml(c.payeeName) },
      { pos: f.amountNumeric, x: f.amountNumeric.xMm, html: escapeHtml(c.amountNumeric) },
      { pos: f.amountWords, x: f.amountWords.xMm, html: escapeHtml(c.amountWords) },
      { pos: { ...f.date, align: 'left' }, x: f.date.xMm, html: dateHtml }
    ]
    for (const line of lines) {
      const yPhys = k * calibration.pageHeightMm + line.pos.yMm + dy
      const page = Math.floor(yPhys / feed)
      const yIn = yPhys - page * feed
      const lineHeight = line.pos.fontSizePt * 0.3528
      if (yIn < EDGE_GUARD_MM || yIn + lineHeight > feed - EDGE_GUARD_MM) {
        throw new Error(
          k === 0
            ? 'Una línea del primer cheque cae en el borde de la hoja del driver. Revisa las posiciones y el ajuste Y de Windows en Ajustes.'
            : `El cheque ${k + 1} cae en el borde entre dos hojas de la impresora (cada hoja del driver mide ` +
                `${feed} mm y cada cheque ${calibration.pageHeightMm} mm). Imprime hasta ${k} cheque${k === 1 ? '' : 's'} a la vez.`
        )
      }
      ;(pages[page] ??= []).push(
        `<div class="f" style="${boxStyle(line.pos, calibration, line.x + dx, yIn)}">${line.html}</div>`
      )
    }
  })

  const html = Array.from({ length: pages.length }, (_, i) => `<div class="page">${(pages[i] ?? []).join('')}</div>`)
  return wrapDocument(html.join(''), calibration, extraCss)
}

/** Una hoja con una sola línea (con la letra e intensidad actuales) para probar sin gastar varias formas. */
export function buildWindowsFontTestHtml(calibration: CalibrationSettings, extraCss = ''): string {
  const pos = calibration.fields.payeeName
  const x = pos.xMm + calibration.offsetXMm + calibration.winOffsetXMm
  const y = pos.yMm + calibration.offsetYMm + calibration.winOffsetYMm
  const box = `<div class="f" style="${boxStyle({ ...pos, align: 'left' }, calibration, x, y)}">RICARDO SANCHEZ SARABIA     3,388.80</div>`
  return wrapDocument(`<div class="page">${box}</div>`, calibration, extraCss)
}

