import { contextBridge, ipcRenderer } from 'electron'
import type {
  CalibrationSettings,
  CheckRecord,
  HistoryFilters,
  NewCheckInput,
  PersonType,
  PrintableCheck,
  Worker
} from '../shared/types'

const api = {
  workers: {
    listActive: (): Promise<Worker[]> => ipcRenderer.invoke('workers:listActive'),
    listAll: (): Promise<Worker[]> => ipcRenderer.invoke('workers:listAll'),
    add: (name: string): Promise<Worker> => ipcRenderer.invoke('workers:add', name),
    rename: (id: string, name: string): Promise<void> =>
      ipcRenderer.invoke('workers:rename', id, name),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('workers:delete', id),
    setActive: (id: string, active: boolean): Promise<void> =>
      ipcRenderer.invoke('workers:setActive', id, active)
  },
  ejidatarios: {
    listActive: (): Promise<Ejidatario[]> => ipcRenderer.invoke('ejidatarios:listActive'),
    listAll: (): Promise<Ejidatario[]> => ipcRenderer.invoke('ejidatarios:listAll'),
    add: (name: string): Promise<Ejidatario> => ipcRenderer.invoke('ejidatarios:add', name),
    rename: (id: string, name: string): Promise<void> =>
      ipcRenderer.invoke('ejidatarios:rename', id, name),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('ejidatarios:delete', id),
    setActive: (id: string, active: boolean): Promise<void> =>
      ipcRenderer.invoke('ejidatarios:setActive', id, active)
  },
  checks: {
    insert: (input: NewCheckInput): Promise<CheckRecord> =>
      ipcRenderer.invoke('checks:insert', input),
    listPending: (personType?: PersonType): Promise<CheckRecord[]> =>
      ipcRenderer.invoke('checks:listPending', personType),
    history: (filters: HistoryFilters): Promise<CheckRecord[]> =>
      ipcRenderer.invoke('checks:history', filters),
    deletePending: (id: string): Promise<void> => ipcRenderer.invoke('checks:deletePending', id)
  },
  calibration: {
    load: (): Promise<CalibrationSettings> => ipcRenderer.invoke('calibration:load'),
    save: (settings: CalibrationSettings): Promise<void> =>
      ipcRenderer.invoke('calibration:save', settings),
    listPrinters: (): Promise<{ name: string; displayName: string }[]> =>
      ipcRenderer.invoke('calibration:listPrinters'),
    pickReferenceImage: (): Promise<string | null> =>
      ipcRenderer.invoke('calibration:pickReferenceImage'),
    referenceImageDataUrl: (settings?: CalibrationSettings): Promise<string | null> =>
      ipcRenderer.invoke('calibration:referenceImageDataUrl', settings)
  },
  print: {
    batch: (ids: string[]): Promise<number> => ipcRenderer.invoke('print:batch', ids),
    reprint: (id: string): Promise<void> => ipcRenderer.invoke('print:reprint', id),
    quickTest: (printerName: string): Promise<void> =>
      ipcRenderer.invoke('print:quickTest', printerName),
    fontTest: (calibration: CalibrationSettings): Promise<void> =>
      ipcRenderer.invoke('print:fontTest', calibration),
    testPage: (calibration: CalibrationSettings): Promise<void> =>
      ipcRenderer.invoke('print:testPage', calibration),
    preview: (check: PrintableCheck, calibration?: CalibrationSettings): Promise<string> =>
      ipcRenderer.invoke('print:preview', check, calibration)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
