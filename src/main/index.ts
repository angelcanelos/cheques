import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import { copyFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { is } from './env'
import * as store from './store'
import * as printing from './printing'
import type { CalibrationSettings, NewCheckInput, PersonType, PrintableCheck } from '../shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    icon: nativeImage.createFromPath(join(app.getAppPath(), 'resources', 'icon.png')),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  // Al volver a la ventana se devuelve el foco del teclado a la página.
  mainWindow.on('focus', () => mainWindow?.webContents.focus())

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('workers:listActive', () => store.listActiveWorkers())
  ipcMain.handle('workers:listAll', () => store.listAllWorkers())
  ipcMain.handle('workers:add', (_e, name: string) => store.addWorker(name))
  ipcMain.handle('workers:rename', (_e, id: string, name: string) => store.renameWorker(id, name))
  ipcMain.handle('workers:delete', (_e, id: string) => store.deleteWorker(id))
  ipcMain.handle('workers:setActive', (_e, id: string, active: boolean) =>
    store.setWorkerActive(id, active)
  )

  ipcMain.handle('ejidatarios:listActive', () => store.listActiveEjidatarios())
  ipcMain.handle('ejidatarios:listAll', () => store.listAllEjidatarios())
  ipcMain.handle('ejidatarios:add', (_e, name: string) => store.addEjidatario(name))
  ipcMain.handle('ejidatarios:rename', (_e, id: string, name: string) => store.renameEjidatario(id, name))
  ipcMain.handle('ejidatarios:delete', (_e, id: string) => store.deleteEjidatario(id))
  ipcMain.handle('ejidatarios:setActive', (_e, id: string, active: boolean) =>
    store.setEjidatarioActive(id, active)
  )

  ipcMain.handle('checks:insert', (_e, input: NewCheckInput) => store.insertCheck(input))
  ipcMain.handle('checks:listPending', (_e, personType?: PersonType) =>
    store.listPending(personType)
  )
  ipcMain.handle('checks:history', (_e, filters) => store.listHistory(filters ?? {}))
  ipcMain.handle('checks:deletePending', (_e, id: string) => store.deletePending(id))

  ipcMain.handle('calibration:load', () => store.loadCalibration())
  ipcMain.handle('calibration:save', (_e, settings: CalibrationSettings) =>
    store.saveCalibration(settings)
  )
  ipcMain.handle('calibration:listPrinters', () => printing.listPrinters())
  ipcMain.handle('calibration:referenceImageDataUrl', (_e, settings?: CalibrationSettings) =>
    printing.getReferenceImageDataUrl(settings ?? store.loadCalibration())
  )
  ipcMain.handle('calibration:pickReferenceImage', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecciona un escaneo o foto del formato completo',
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const source = result.filePaths[0]
    const dest = store.getReferenceImageDestPath(extname(source))
    copyFileSync(source, dest)
    return dest
  })

  // Imprime en lote los cheques pendientes (una forma continua por cheque, en orden).
  ipcMain.handle('print:batch', async (_e, ids: string[]) => {
    const calibration = store.loadCalibration()
    const checks = store.getChecks(ids).filter((c) => c.status === 'pending')
    await printing.printChecks(checks, calibration)
    store.markPrinted(checks.map((c) => c.id))
    return checks.length
  })

  // Reimprime uno o varios cheques ya impresos (una forma por cheque, en el orden elegido).
  ipcMain.handle('print:reprint', async (_e, ids: string[]) => {
    const calibration = store.loadCalibration()
    const checks = store.getChecks(ids).filter((c) => c.status === 'printed')
    await printing.printChecks(checks, calibration)
    checks.forEach((c) => store.markReprinted(c.id))
    return checks.length
  })

  ipcMain.handle('print:quickTest', (_e, printerName: string) =>
    printing.printQuickTest(printerName)
  )

  ipcMain.handle('print:fontTest', (_e, calibration: CalibrationSettings) =>
    printing.printFontTest(calibration)
  )

  ipcMain.handle('print:testPage', async (_e, calibration: CalibrationSettings) => {
    // Dos formas seguidas: sirve para comprobar que el segundo cheque sale bien alineado.
    await printing.printChecks([printing.SAMPLE_CHECK, printing.SAMPLE_CHECK], calibration)
  })

  ipcMain.handle(
    'print:preview',
    (_e, check: PrintableCheck, calibration?: CalibrationSettings) =>
      printing.buildPreviewHtml(check, calibration ?? store.loadCalibration())
  )
}

app.whenReady().then(() => {
  store.seedEjidatariosOnce()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
