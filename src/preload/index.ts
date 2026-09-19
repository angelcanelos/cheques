import { contextBridge, ipcRenderer } from 'electron'
import type {
  CalibrationSettings,
  CheckPrintData,
  HistoryFilters,
  Worker
} from '../shared/types'

const api = {
  workers: {
    listActive: (): Promise<Worker[]> => ipcRenderer.invoke('workers:listActive'),
    listAll: (): Promise<Worker[]> => ipcRenderer.invoke('workers:listAll'),
    add: (name: string): Promise<Worker> => ipcRenderer.invoke('workers:add', name),
    rename: (id: string, name: string): Promise<void> =>
      ipcRenderer.invoke('workers:rename', id, name),
    setActive: (id: string, active: boolean): Promise<void> =>
      ipcRenderer.invoke('workers:setActive', id, active)
  },
  checks: {
    insert: (input: {
      workerId: string
      workerName: string
      amountCents: number
      amountWords: string
      checkDate: string
    }) => ipcRenderer.invoke('checks:insert', input),
    history: (filters: HistoryFilters) => ipcRenderer.invoke('checks:history', filters),
    markReprinted: (id: string): Promise<void> => ipcRenderer.invoke('checks:markReprinted', id)
  },
  calibration: {
    load: (): Promise<CalibrationSettings> => ipcRenderer.invoke('calibration:load'),
    save: (settings: CalibrationSettings): Promise<void> =>
      ipcRenderer.invoke('calibration:save', settings),
    listPrinters: (): Promise<{ name: string; displayName: string }[]> =>
      ipcRenderer.invoke('calibration:listPrinters'),
    pickReferenceImage: (): Promise<string | null> =>
      ipcRenderer.invoke('calibration:pickReferenceImage')
  },
  print: {
    check: (data: CheckPrintData): Promise<void> => ipcRenderer.invoke('print:check', data),
    preview: (data: CheckPrintData): Promise<string> =>
      ipcRenderer.invoke('print:preview', data),
    previewWithCalibration: (
      data: CheckPrintData,
      calibration: CalibrationSettings
    ): Promise<string> =>
      ipcRenderer.invoke('print:previewWithCalibration', data, calibration),
    testPage: (calibration: CalibrationSettings): Promise<void> =>
      ipcRenderer.invoke('print:testPage', calibration)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
