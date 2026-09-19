import { BrowserWindow, WebContentsPrintOptions } from 'electron'
import type { CalibrationSettings, CheckPrintData, FieldKey } from '../shared/types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildCheckHtml(data: CheckPrintData, calibration: CalibrationSettings): string {
  const fieldText: Record<FieldKey, string> = {
    payeeName: data.payeeName,
    amountNumeric: data.amountNumericText,
    amountWords: data.amountWordsText,
    date: data.dateText
  }

  const fieldsHtml = (Object.keys(fieldText) as FieldKey[])
    .map((key) => {
      const pos = calibration.fields[key]
      const text = escapeHtml(fieldText[key])
      const weight = pos.bold ? 'bold' : 'normal'
      return `<div style="position:absolute; left:${pos.xMm}mm; top:${pos.yMm}mm; font-size:${pos.fontSizePt}pt; font-weight:${weight}; font-family: Arial, sans-serif; white-space:nowrap; color:#000;">${text}</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${calibration.pageWidthMm}mm ${calibration.pageHeightMm}mm; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${calibration.pageWidthMm}mm;
    height: ${calibration.pageHeightMm}mm;
  }
  .page { position: relative; width: ${calibration.pageWidthMm}mm; height: ${calibration.pageHeightMm}mm; }
</style>
</head>
<body>
  <div class="page">
    ${fieldsHtml}
  </div>
</body>
</html>`
}

async function printHtml(html: string, printerName: string | null, silent: boolean): Promise<void> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true }
  })

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const options: WebContentsPrintOptions = {
      silent,
      printBackground: true,
      margins: { marginType: 'none' }
    }
    if (printerName) {
      options.deviceName = printerName
    }

    await new Promise<void>((resolve, reject) => {
      win.webContents.print(options, (success, errorType) => {
        if (success || silent === false) {
          // Cuando silent es false, el usuario pudo cancelar el diálogo: no lo
          // tratamos como error, solo terminamos sin lanzar excepción.
          resolve()
        } else {
          reject(new Error(errorType || 'No se pudo imprimir.'))
        }
      })
    })
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

export async function printCheck(data: CheckPrintData, calibration: CalibrationSettings): Promise<void> {
  const html = buildCheckHtml(data, calibration)
  // silent:false abre el diálogo nativo de impresión de Windows, donde la
  // secretaria puede elegir la impresora antes de imprimir.
  await printHtml(html, calibration.printerName, false)
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

export function buildPreviewHtml(data: CheckPrintData, calibration: CalibrationSettings): string {
  return buildCheckHtml(data, calibration)
}
