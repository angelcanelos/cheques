import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EJIDATARIOS_SEED } from './ejidatariosSeed'
import type {
  CalibrationSettings,
  CheckRecord,
  Ejidatario,
  HistoryFilters,
  NewCheckInput,
  PersonType,
  Worker
} from '../shared/types'

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
  const trimmed = name.trim().toLocaleUpperCase('es-MX')
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
  const trimmed = newName.trim().toLocaleUpperCase('es-MX')
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

export function deleteWorker(id: string): void {
  // El historial y los cheques pendientes conservan el nombre, así que no se pierden.
  saveWorkers(loadWorkers().filter((w) => w.id !== id))
}

// ---------- Ejidatarios ----------

function loadEjidatarios(): Ejidatario[] {
  return readJson<Ejidatario[]>('ejidatarios.json', [])
}

function saveEjidatarios(ejidatarios: Ejidatario[]): void {
  writeJson('ejidatarios.json', ejidatarios)
}

/**
 * Agrega la lista inicial de ejidatarios una sola vez por instalación. Se mezcla con los que
 * ya existan (sin duplicar) y, como queda una marca, los que se eliminen después no regresan.
 */
export function seedEjidatariosOnce(): void {
  const marker = join(getDataDir(), 'ejidatarios.seeded')
  if (existsSync(marker)) return
  const current = loadEjidatarios()
  const known = new Set(current.map((e) => e.name.trim().toLowerCase()))
  const now = new Date().toISOString()
  for (const name of EJIDATARIOS_SEED) {
    if (known.has(name.toLowerCase())) continue
    current.push({ id: randomUUID(), name, active: true, createdAt: now })
  }
  saveEjidatarios(current)
  writeFileSync(marker, now, 'utf-8')
}

export function listActiveEjidatarios(): Ejidatario[] {
  return loadEjidatarios()
    .filter((e) => e.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}

export function listAllEjidatarios(): Ejidatario[] {
  return loadEjidatarios().sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  })
}

export function addEjidatario(name: string): Ejidatario {
  const trimmed = name.trim().toLocaleUpperCase('es-MX')
  if (!trimmed) throw new Error('El nombre del ejidatario no puede estar vacío.')
  const ejidatarios = loadEjidatarios()
  const exists = ejidatarios.some((e) => e.name.trim().toLowerCase() === trimmed.toLowerCase())
  if (exists) throw new Error(`Ya existe un ejidatario con el nombre "${trimmed}".`)
  const ejidatario: Ejidatario = {
    id: randomUUID(),
    name: trimmed,
    active: true,
    createdAt: new Date().toISOString()
  }
  ejidatarios.push(ejidatario)
  saveEjidatarios(ejidatarios)
  return ejidatario
}

export function renameEjidatario(id: string, newName: string): void {
  const trimmed = newName.trim().toLocaleUpperCase('es-MX')
  if (!trimmed) throw new Error('El nombre del ejidatario no puede estar vacío.')
  const ejidatarios = loadEjidatarios()
  const exists = ejidatarios.some(
    (e) => e.id !== id && e.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (exists) throw new Error(`Ya existe un ejidatario con el nombre "${trimmed}".`)
  const ejidatario = ejidatarios.find((e) => e.id === id)
  if (!ejidatario) throw new Error('Ejidatario no encontrado.')
  ejidatario.name = trimmed
  saveEjidatarios(ejidatarios)
}

export function setEjidatarioActive(id: string, active: boolean): void {
  const ejidatarios = loadEjidatarios()
  const ejidatario = ejidatarios.find((e) => e.id === id)
  if (!ejidatario) throw new Error('Ejidatario no encontrado.')
  ejidatario.active = active
  saveEjidatarios(ejidatarios)
}

export function deleteEjidatario(id: string): void {
  saveEjidatarios(loadEjidatarios().filter((e) => e.id !== id))
}

// ---------- Cheques (pendientes e impresos) ----------

function loadChecks(): CheckRecord[] {
  const raw = readJson<Partial<CheckRecord>[]>('checks.json', [])
  // Registros de versiones anteriores no tenían estado: eran cheques ya impresos.
  // Tampoco tenían personType: se consideran de trabajadores.
  return raw.map((c) => ({
    ...(c as CheckRecord),
    status: c.status ?? 'printed',
    createdAt: c.createdAt ?? c.printedAt ?? new Date().toISOString(),
    printedAt: c.printedAt ?? null,
    reprintCount: c.reprintCount ?? 0,
    personType: c.personType ?? 'trabajadores'
  }))
}

function saveChecks(checks: CheckRecord[]): void {
  writeJson('checks.json', checks)
}

export function insertCheck(input: NewCheckInput): CheckRecord {
  const checks = loadChecks()
  const record: CheckRecord = {
    id: randomUUID(),
    workerId: input.workerId,
    workerName: input.workerName,
    amountCents: input.amountCents,
    amountWords: input.amountWords,
    checkDate: input.checkDate,
    status: 'pending',
    createdAt: new Date().toISOString(),
    printedAt: null,
    reprintCount: 0,
    personType: input.personType
  }
  checks.push(record)
  saveChecks(checks)
  return record
}

export function getChecks(ids: string[]): CheckRecord[] {
  const checks = loadChecks()
  // Se conserva el orden en que se pidieron (el orden en que saldrán los cheques).
  return ids.map((id) => checks.find((c) => c.id === id)).filter((c): c is CheckRecord => !!c)
}

export function listPending(personType?: PersonType): CheckRecord[] {
  return loadChecks()
    .filter((c) => c.status === 'pending' && (!personType || c.personType === personType))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function deletePending(id: string): void {
  const checks = loadChecks()
  const record = checks.find((c) => c.id === id)
  if (!record) return
  if (record.status !== 'pending') throw new Error('Solo se pueden eliminar cheques pendientes.')
  saveChecks(checks.filter((c) => c.id !== id))
}

export function markPrinted(ids: string[]): void {
  const checks = loadChecks()
  const now = new Date().toISOString()
  for (const c of checks) {
    if (ids.includes(c.id)) {
      c.status = 'printed'
      c.printedAt = now
    }
  }
  saveChecks(checks)
}

export function listHistory(filters: HistoryFilters): CheckRecord[] {
  let checks = loadChecks()
  if (filters.personType) {
    checks = checks.filter((c) => c.personType === filters.personType)
  }
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
    return b.createdAt.localeCompare(a.createdAt)
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

const CALIBRATION_VERSION = 10

/** Largo real de una forma (un cheque) medido con la impresora. */
const FORM_LENGTH_MM = 203.4

/** Los largos que se usaron antes como base (200, 203.2 y 203.8) se actualizan al valor medido. */
const normalizeFormLength = (v: number | undefined): number =>
  v === undefined || v === 200 || v === 203.2 || v === 203.8 ? FORM_LENGTH_MM : v

/** Ancho de un carácter a 10 caracteres por pulgada (la letra que se usa por defecto). */
const CHAR_MM = 25.4 / 10

/**
 * Posiciones base: son las que la secretaria dejó calibradas y que salen alineadas en la
 * forma real (nombre, monto, cantidad con letra y fecha como un solo conjunto).
 */
function defaultCalibration(): CalibrationSettings {
  return {
    version: CALIBRATION_VERSION,
    pageWidthMm: 215.9,
    pageHeightMm: FORM_LENGTH_MM,
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
}

/** Antes la oscuridad era un nombre (normal/oscura/…); ahora es un nivel del 1 al 5. */
function levelFromDarkness(value: string | undefined, fallback: CalibrationSettings['printLevel']): CalibrationSettings['printLevel'] {
  const map = { normal: 1, dark: 2, darker: 4, darkest: 5 } as const
  return (value && value in map ? map[value as keyof typeof map] : fallback) as CalibrationSettings['printLevel']
}

type LegacyPos = { xMm: number; yMm: number; fontSizePt?: number; align?: 'left' | 'center' | 'right' }

/** Versión 4 tenía día, mes y año por separado: se juntan en un solo conjunto conservando sus medidas. */
function migrateFromV4(stored: Record<string, unknown>, defaults: CalibrationSettings): CalibrationSettings {
  const f = (stored.fields ?? {}) as Record<string, LegacyPos | undefined>
  const keep = (key: 'payeeName' | 'amountNumeric' | 'amountWords') => ({
    ...defaults.fields[key],
    ...(f[key] ? { xMm: f[key]!.xMm, yMm: f[key]!.yMm, align: f[key]!.align ?? 'left' } : {}),
    bold: true
  })
  const result = { ...defaults, fields: { ...defaults.fields } }
  result.fields.payeeName = keep('payeeName')
  result.fields.amountNumeric = keep('amountNumeric')
  result.fields.amountWords = keep('amountWords')
  if (f.day && f.month && f.year) {
    const dayW = 2 * CHAR_MM
    const dayLeft = f.day.align === 'right' ? f.day.xMm - dayW : f.day.xMm
    const rows = [f.day.yMm, f.month.yMm, f.year.yMm]
    result.fields.date = {
      ...defaults.fields.date,
      xMm: Math.round(dayLeft * 10) / 10,
      yMm: Math.round((rows.reduce((a, b) => a + b, 0) / rows.length) * 10) / 10
    }
    result.dateGapDayMonthMm = Math.max(0, Math.round((f.month.xMm - (dayLeft + dayW)) * 10) / 10)
    result.dateGapMonthYearMm = Math.max(0, Math.round((f.year.xMm - (f.month.xMm + dayW)) * 10) / 10)
    // Mismo ajuste que v5 -> v6: mes 2 mm a la derecha, año 2 mm a la izquierda, fecha 2 mm más abajo.
    result.dateGapDayMonthMm = Math.round((result.dateGapDayMonthMm + 2) * 10) / 10
    result.dateGapMonthYearMm = Math.max(0, Math.round((result.dateGapMonthYearMm - 4) * 10) / 10)
    result.fields.date.yMm = Math.round((result.fields.date.yMm + 2) * 10) / 10
  }
  return result
}

export function loadCalibration(): CalibrationSettings {
  const defaults = defaultCalibration()
  const stored = readJson<Record<string, unknown> | null>('calibration.json', null)
  if (!stored) return defaults

  const version = (stored.version as number | undefined) ?? 1
  const common = {
    printerName: (stored.printerName as string | null | undefined) ?? null,
    printMode: (stored.printMode as CalibrationSettings['printMode'] | undefined) ?? defaults.printMode
  }

  if (version < 4) return { ...defaults, ...common }

  if (version === 4) {
    const migrated = migrateFromV4(stored, defaults)
    // Mismo ajuste que v7 -> v8: fecha y monto 2 mm más abajo.
    migrated.fields.date.yMm = Math.round((migrated.fields.date.yMm + 2) * 10) / 10
    migrated.fields.amountNumeric.yMm = Math.round((migrated.fields.amountNumeric.yMm + 2) * 10) / 10
    return {
      ...migrated,
      ...common,
      pageWidthMm: (stored.pageWidthMm as number | undefined) ?? defaults.pageWidthMm,
      pageHeightMm: normalizeFormLength(stored.pageHeightMm as number | undefined),
      offsetXMm: (stored.offsetXMm as number | undefined) ?? 0,
      offsetYMm: (stored.offsetYMm as number | undefined) ?? 0,
      referenceImagePath: (stored.referenceImagePath as string | null | undefined) ?? null
    }
  }

  const st = stored as Partial<CalibrationSettings>
  const fields = { ...defaults.fields }
  const pageHeightMm = normalizeFormLength(st.pageHeightMm)
  // v5 -> v6: mes 2 mm a la derecha, año 2 mm a la izquierda y la fecha 2 mm más abajo.
  const from5 = version === 5
  const gap1 = (st.dateGapDayMonthMm ?? defaults.dateGapDayMonthMm) + (from5 ? 2 : 0)
  const gap2 = Math.max(0, (st.dateGapMonthYearMm ?? defaults.dateGapMonthYearMm) - (from5 ? 4 : 0))
  for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
    fields[key] = { ...defaults.fields[key], ...st.fields?.[key] }
  }
  if (from5) fields.date = { ...fields.date, yMm: Math.round((fields.date.yMm + 2) * 10) / 10 }
  // v8 -> v9: modo Windows con letra Arial (más moderna que la de la impresora).
  const older9 = version < 9
  // v7 -> v8: fecha y monto 2 mm más abajo; letra Roman (parecida a Cambria) y más oscura.
  const older8 = version < 8
  if (older8) {
    fields.date = { ...fields.date, yMm: Math.round((fields.date.yMm + 2) * 10) / 10 }
    fields.amountNumeric = {
      ...fields.amountNumeric,
      yMm: Math.round((fields.amountNumeric.yMm + 2) * 10) / 10
    }
  }
  return {
    ...defaults,
    ...common,
    pageWidthMm: st.pageWidthMm ?? defaults.pageWidthMm,
    pageHeightMm,
    referenceImagePath: st.referenceImagePath ?? null,
    offsetXMm: st.offsetXMm ?? 0,
    offsetYMm: st.offsetYMm ?? 0,
    rotateLandscape: st.rotateLandscape ?? false,
    batchOffsetYMm: st.batchOffsetYMm ?? 0,
    printFont: older9 ? defaults.printFont : (st.printFont ?? defaults.printFont),
    printMode: older9 ? 'windows' : (st.printMode ?? defaults.printMode),
    windowsPrinterName: st.windowsPrinterName ?? null,
    driverPaper: st.driverPaper ?? defaults.driverPaper,
    winOffsetXMm: st.winOffsetXMm ?? defaults.winOffsetXMm,
    winOffsetYMm: st.winOffsetYMm ?? defaults.winOffsetYMm,
    printLevel: st.printLevel ?? levelFromDarkness((stored as { printDarkness?: string }).printDarkness, defaults.printLevel),
    boldEnabled: st.boldEnabled ?? defaults.boldEnabled,
    windowsFont: st.windowsFont ?? defaults.windowsFont,
    dateGapDayMonthMm: Math.round(gap1 * 10) / 10,
    dateGapMonthYearMm: Math.round(gap2 * 10) / 10,
    fields
  }
}

export function saveCalibration(settings: CalibrationSettings): void {
  writeJson('calibration.json', { ...settings, version: CALIBRATION_VERSION })
}

export function getReferenceImageDestPath(extension: string): string {
  return join(getDataDir(), `cheque_referencia${extension}`)
}
