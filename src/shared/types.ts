export interface Worker {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export interface CheckRecord {
  id: string
  workerId: string
  workerName: string
  amountCents: number
  amountWords: string
  checkDate: string
  printedAt: string
  reprintCount: number
}

export type FieldKey = 'payeeName' | 'amountNumeric' | 'amountWords' | 'date'

export interface FieldPosition {
  xMm: number
  yMm: number
  fontSizePt: number
  bold: boolean
}

export interface CalibrationSettings {
  pageWidthMm: number
  pageHeightMm: number
  printerName: string | null
  referenceImagePath: string | null
  fields: Record<FieldKey, FieldPosition>
}

export interface CheckPrintData {
  payeeName: string
  amountNumericText: string
  amountWordsText: string
  dateText: string
}

export interface HistoryFilters {
  workerName?: string
  dateFrom?: string
  dateTo?: string
}
