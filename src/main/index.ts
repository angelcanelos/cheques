import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { copyFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { is } from './env'
import * as store from './store'
import * as printing from './printing'
import type { CheckPrintData } from '../shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

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
  ipcMain.handle('workers:setActive', (_e, id: string, active: boolean) =>
    store.setWorkerActive(id, active)
  )

  ipcMain.handle('checks:insert', (_e, input) => store.insertCheck(input))
  ipcMain.handle('checks:history', (_e, filters) => store.listHistory(filters ?? {}))
  ipcMain.handle('checks:markReprinted', (_e, id: string) => store.markReprinted(id))

  ipcMain.handle('calibration:load', () => store.loadCalibration())
  ipcMain.handle('calibration:save', (_e, settings) => store.saveCalibration(settings))
  ipcMain.handle('calibration:listPrinters', () => printing.listPrinters())
  ipcMain.handle('calibration:pickReferenceImage', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecciona una imagen del cheque en blanco',
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const source = result.filePaths[0]
    const dest = store.getReferenceImageDestPath(extname(source))
    copyFileSync(source, dest)
    return dest
  })

  ipcMain.handle('print:check', async (_e, data: CheckPrintData) => {
    const calibration = store.loadCalibration()
    await printing.printCheck(data, calibration)
  })

  ipcMain.handle('print:preview', async (_e, data: CheckPrintData) => {
    const calibration = store.loadCalibration()
    return printing.buildPreviewHtml(data, calibration)
  })

  ipcMain.handle(
    'print:previewWithCalibration',
    async (_e, data: CheckPrintData, calibration: Awaited<ReturnType<typeof store.loadCalibration>>) => {
      return printing.buildPreviewHtml(data, calibration)
    }
  )

  ipcMain.handle(
    'print:testPage',
    async (_e, calibration: Awaited<ReturnType<typeof store.loadCalibration>>) => {
      await printing.printCheck(
        {
          payeeName: 'NOMBRE DE PRUEBA',
          amountNumericText: '$1,234.50',
          amountWordsText: 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N.',
          dateText: '01/01/2026'
        },
        calibration
      )
    }
  )
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
