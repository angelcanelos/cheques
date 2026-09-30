import { BrowserWindow, WebContentsPrintOptions } from 'electron'
import type { CalibrationSettings } from '../shared/types'
import { PAPERS } from '../shared/windowsLayout'

/** Si no hay impresora elegida, usa la Epson LX (que no sea la de "texto") o la predeterminada. */
export async function resolveWindowsPrinter(calibration: CalibrationSettings): Promise<string | null> {
  if (calibration.windowsPrinterName) return calibration.windowsPrinterName
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadURL('data:text/html,<html></html>')
    const printers = await win.webContents.getPrintersAsync()
    // Solo la matricial (LX-xxx) con su driver normal; no la de "texto" ni otras Epson (inyección).
    const lx = printers.find((p) => /lx-?\d{3}/i.test(p.name) && !/texto|text/i.test(p.name))
    return (lx ?? printers.find((p) => p.isDefault))?.name ?? null
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

export async function printWindowsHtml(html: string, calibration: CalibrationSettings): Promise<void> {
  const printerName = await resolveWindowsPrinter(calibration)
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    // Espera a que la letra elegida termine de cargarse antes de imprimir.
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    // Con impresora conocida se imprime directo, sin abrir el cuadro de Windows.
    const silent = printerName !== null
    const options: WebContentsPrintOptions = {
      silent,
      printBackground: true,
      margins: { marginType: 'none' },
      landscape: false,
      pageSize: PAPERS[calibration.driverPaper].name
    }
    if (printerName) options.deviceName = printerName

    await new Promise<void>((resolve, reject) => {
      win.webContents.print(options, (success, reason) => {
        if (success || !silent) resolve() // cancelar el cuadro de Windows no es un error
        else reject(new Error(reason || 'No se pudo imprimir.'))
      })
    })
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}
