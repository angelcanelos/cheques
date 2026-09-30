export interface Worker {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export interface Ejidatario {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export type CheckStatus = 'pending' | 'printed'

/** Tipo de persona a la que pertenece un cheque: trabajador o ejidatario. */
export type PersonType = 'trabajadores' | 'ejidatarios'

export interface CheckRecord {
  id: string
  workerId: string
  workerName: string
  amountCents: number
  amountWords: string
  checkDate: string
  status: CheckStatus
  createdAt: string
  printedAt: string | null
  reprintCount: number
  /** Los registros antiguos sin este campo se consideran de trabajadores. */
  personType: PersonType
}

export interface NewCheckInput {
  workerId: string
  workerName: string
  amountCents: number
  amountWords: string
  checkDate: string
  personType: PersonType
}

/** Datos que se colocan en la forma. La fecha es un solo conjunto (día, mes y año en la misma línea). */
export type FieldKey = 'payeeName' | 'amountNumeric' | 'amountWords' | 'date'

export type FieldAlign = 'left' | 'center' | 'right'

export interface FieldPosition {
  xMm: number
  yMm: number
  fontSizePt: number
  bold: boolean
  /** Punto de anclaje: X es el borde izquierdo, el centro o el borde derecho del texto. */
  align: FieldAlign
}

/** Letra de la impresora matricial: Sans Serif (parecida a Arial), Roman, o borrador (más rápida y clara). */
export type PrintFont = 'sans' | 'roman' | 'draft'

/** Nivel de oscuridad de la letra, de 1 (normal) a 5 (máxima). */
export type PrintLevel = 1 | 2 | 3 | 4 | 5

/** Hoja que usa el driver de Windows (la Epson LX-350 solo ofrece Carta y A4). */
export type DriverPaper = 'A4' | 'Letter'

/** 'escp' = texto directo a la impresora matricial (Epson LX, ESC/P). 'windows' = impresión gráfica por el driver. */
export type PrintMode = 'escp' | 'windows'

export interface CalibrationSettings {
  version: number
  /** Ancho y largo de UNA forma continua (un cheque). El largo define cuánto avanza el papel entre cheques. */
  pageWidthMm: number
  pageHeightMm: number
  printMode: PrintMode
  /** Impresora del modo directo (la de "texto"). */
  printerName: string | null
  /** Impresora del modo Windows (la Epson con su driver normal). Vacío = detectarla sola. */
  windowsPrinterName: string | null
  driverPaper: DriverPaper
  /** Ajuste solo del modo Windows: el origen de la hoja del driver es distinto al del modo directo. */
  winOffsetXMm: number
  winOffsetYMm: number
  referenceImagePath: string | null
  /** Ajuste global aplicado a todos los datos (para corregir un corrimiento general). */
  offsetXMm: number
  offsetYMm: number
  /** Ajuste vertical extra que solo se aplica cuando se imprimen varios cheques a la vez (+ = abajo). */
  batchOffsetYMm: number
  /** Solo modo Windows: gira la página 90° si la impresora la saca de lado. */
  rotateLandscape: boolean
  printFont: PrintFont
  printLevel: PrintLevel
  /** false = letra de peso normal (fina) aunque el nivel de oscuridad siga alto. */
  boldEnabled: boolean
  /** Letra del modo Windows (catálogo en shared/fonts.ts). */
  windowsFont: string
  /** Separación entre el día y el mes, y entre el mes y el año (mm). */
  dateGapDayMonthMm: number
  dateGapMonthYearMm: number
  fields: Record<FieldKey, FieldPosition>
}

/** Texto final que se imprime en cada posición. */
export interface CheckPrintData {
  payeeName: string
  amountNumeric: string
  amountWords: string
  day: string
  month: string
  year: string
}

export interface PrintableCheck {
  workerName: string
  amountCents: number
  amountWords: string
  checkDate: string
}

export interface HistoryFilters {
  workerName?: string
  dateFrom?: string
  dateTo?: string
  personType?: PersonType
}
