import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CalibrationSettings, CheckRecord, HistoryFilters, Worker } from '../shared/types'

function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function readJson<T>(fileName: string, fallback: T): T {
  const path = join(getDataDir(), fileName)
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(fileName: string, data: T): void {
  const dir = getDataDir()
  const path = join(dir, fileName)
  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

// ---------- Trabajadores ----------

function loadWorkers(): Worker[] {
  return readJson<Worker[]>('workers.json', [])
}

function saveWorkers(workers: Worker[]): void {
  writeJson('workers.json', workers)
}

export function listActiveWorkers(): Worker[] {
  return loadWorkers()
    .filter((w) => w.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}

export function listAllWorkers(): Worker[] {
  return loadWorkers().sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  })
}

export function addWorker(name: string): Worker {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('El nombre del trabajador no puede estar vacío.')
  const workers = loadWorkers()
  const exists = workers.some((w) => w.name.trim().toLowerCase() === trimmed.toLowerCase())
  if (exists) throw new Error(`Ya existe un trabajador con el nombre "${trimmed}".`)
  const worker: Worker = {
    id: randomUUID(),
    name: trimmed,
    active: true,
    createdAt: new Date().toISOString()
  }
  workers.push(worker)
  saveWorkers(workers)
  return worker
}

export function renameWorker(id: string, newName: string): void {
  const trimmed = newName.trim()
  if (!trimmed) throw new Error('El nombre del trabajador no puede estar vacío.')
  const workers = loadWorkers()
  const exists = workers.some(
    (w) => w.id !== id && w.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (exists) throw new Error(`Ya existe un trabajador con el nombre "${trimmed}".`)
  const worker = workers.find((w) => w.id === id)
  if (!worker) throw new Error('Trabajador no encontrado.')
  worker.name = trimmed
  saveWorkers(workers)
}

export function setWorkerActive(id: string, active: boolean): void {
  const workers = loadWorkers()
  const worker = workers.find((w) => w.id === id)
  if (!worker) throw new Error('Trabajador no encontrado.')
  worker.active = active
  saveWorkers(workers)
}

// ---------- Historial de cheques ----------

function loadChecks(): CheckRecord[] {
  return readJson<CheckRecord[]>('checks.json', [])
}

function saveChecks(checks: CheckRecord[]): void {
  writeJson('checks.json', checks)
}

export function insertCheck(input: {
  workerId: string
  workerName: string
  amountCents: number
  amountWords: string
  checkDate: string
}): CheckRecord {
  const checks = loadChecks()
  const record: CheckRecord = {
    id: randomUUID(),
    workerId: input.workerId,
    workerName: input.workerName,
    amountCents: input.amountCents,
    amountWords: input.amountWords,
    checkDate: input.checkDate,
    printedAt: new Date().toISOString(),
    reprintCount: 0
  }
  checks.push(record)
  saveChecks(checks)
  return record
}

export function listHistory(filters: HistoryFilters): CheckRecord[] {
  let checks = loadChecks()
  if (filters.workerName) {
    const needle = filters.workerName.trim().toLowerCase()
    checks = checks.filter((c) => c.workerName.toLowerCase().includes(needle))
  }
  if (filters.dateFrom) {
    checks = checks.filter((c) => c.checkDate >= filters.dateFrom!)
  }
  if (filters.dateTo) {
    checks = checks.filter((c) => c.checkDate <= filters.dateTo!)
  }
  return checks.sort((a, b) => {
    if (a.checkDate !== b.checkDate) return b.checkDate.localeCompare(a.checkDate)
    return b.printedAt.localeCompare(a.printedAt)
  })
}

export function markReprinted(id: string): void {
  const checks = loadChecks()
  const record = checks.find((c) => c.id === id)
  if (!record) throw new Error('Cheque no encontrado.')
  record.reprintCount += 1
  saveChecks(checks)
}

// ---------- Calibración ----------

const DEFAULT_CALIBRATION: CalibrationSettings = {
  pageWidthMm: 216,
  pageHeightMm: 90,
  printerName: null,
  referenceImagePath: null,
  fields: {
    payeeName: { xMm: 20, yMm: 25, fontSizePt: 11, bold: false },
    amountNumeric: { xMm: 170, yMm: 25, fontSizePt: 11, bold: false },
    amountWords: { xMm: 20, yMm: 32, fontSizePt: 11, bold: false },
    date: { xMm: 170, yMm: 10, fontSizePt: 11, bold: false }
  }
}

export function loadCalibration(): CalibrationSettings {
  const stored = readJson<Partial<CalibrationSettings> | null>('calibration.json', null)
  if (!stored) return structuredClone(DEFAULT_CALIBRATION)
  return {
    pageWidthMm: stored.pageWidthMm ?? DEFAULT_CALIBRATION.pageWidthMm,
    pageHeightMm: stored.pageHeightMm ?? DEFAULT_CALIBRATION.pageHeightMm,
    printerName: stored.printerName ?? null,
    referenceImagePath: stored.referenceImagePath ?? null,
    fields: {
      payeeName: { ...DEFAULT_CALIBRATION.fields.payeeName, ...stored.fields?.payeeName },
      amountNumeric: {
        ...DEFAULT_CALIBRATION.fields.amountNumeric,
        ...stored.fields?.amountNumeric
      },
      amountWords: { ...DEFAULT_CALIBRATION.fields.amountWords, ...stored.fields?.amountWords },
      date: { ...DEFAULT_CALIBRATION.fields.date, ...stored.fields?.date }
    }
  }
}

export function saveCalibration(settings: CalibrationSettings): void {
  writeJson('calibration.json', settings)
}

export function getReferenceImageDestPath(extension: string): string {
  return join(getDataDir(), `cheque_referencia${extension}`)
}
