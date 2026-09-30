import { useEffect, useState } from 'react'
import { Image as ImageIcon, Move, Printer, Save, SlidersHorizontal } from 'lucide-react'
import type { CalibrationSettings, FieldAlign, FieldKey, PrintableCheck } from '@shared/types'
import { amountToPesosText } from '@shared/amountToWords'
import { formatCheckAmount, formatWordsLine, splitCheckDate } from '@shared/format'
import DragCalibrationModal from '../components/DragCalibrationModal'
import ScaledPreview from '../components/ScaledPreview'
import { useDialogs } from '../components/Dialogs'

const FIELD_LABELS: Record<FieldKey, string> = {
  payeeName: 'Nombre',
  amountNumeric: 'Monto (número)',
  amountWords: 'Monto en letras',
  date: 'Fecha (día, mes, año)'
}

const FIELD_ORDER: FieldKey[] = ['payeeName', 'amountNumeric', 'amountWords', 'date']

const SAMPLE: PrintableCheck = {
  workerName: 'NOMBRE DE PRUEBA',
  amountCents: 214040,
  amountWords: '',
  checkDate: '2026-09-17'
}

export default function CalibrationView(): JSX.Element {
  const { alert } = useDialogs()
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [dragModalOpen, setDragModalOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [loaded, printerList] = await Promise.all([
        window.api.calibration.load(),
        window.api.calibration.listPrinters()
      ])
      setCalibration(loaded)
      setPrinters(printerList)
    })()
  }, [])

  useEffect(() => {
    if (!calibration) return
    let cancelled = false
    window.api.print.preview(SAMPLE, calibration).then((html) => {
      if (!cancelled) setPreviewHtml(html)
    })
    return () => {
      cancelled = true
    }
  }, [calibration])

  if (!calibration) {
    return <div className="px-10 py-9 text-slate-500">Cargando calibración…</div>
  }

  function patch(changes: Partial<CalibrationSettings>): void {
    setCalibration((prev) => (prev ? { ...prev, ...changes } : prev))
  }

  function updateField(key: FieldKey, changes: Partial<CalibrationSettings['fields'][FieldKey]>): void {
    setCalibration((prev) =>
      prev ? { ...prev, fields: { ...prev.fields, [key]: { ...prev.fields[key], ...changes } } } : prev
    )
  }

  function flashSaved(): void {
    setSavedMessage('Los cambios se guardaron correctamente.')
    setTimeout(() => setSavedMessage(null), 2500)
  }

  async function handleLoadReferenceImage(): Promise<void> {
    const path = await window.api.calibration.pickReferenceImage()
    if (path) patch({ referenceImagePath: path })
  }

  async function handleTestPrint(): Promise<void> {
    if (!calibration) return
    if (calibration.printMode === 'escp' && !calibration.printerName) {
      alert('Elige primero la impresora en Ajustes.')
      return
    }
    try {
      await window.api.print.testPage(calibration)
    } catch (err) {
      alert(`No se pudo imprimir la prueba:\n${(err as Error).message}`)
    }
  }

  async function handleSave(): Promise<void> {
    if (!calibration) return
    await window.api.calibration.save(calibration)
    flashSaved()
  }

  const sampleDate = splitCheckDate(SAMPLE.checkDate)
  const sampleText: Record<FieldKey, string> = {
    payeeName: SAMPLE.workerName,
    amountNumeric: formatCheckAmount(SAMPLE.amountCents / 100),
    amountWords: formatWordsLine(amountToPesosText(SAMPLE.amountCents / 100)),
    date: `${sampleDate.day} ${sampleDate.month} ${sampleDate.year}`
  }

  return (
    <div className="px-10 py-9">
      <div className="mb-2 flex items-center gap-3">
        <SlidersHorizontal className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Calibración de impresión</h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-slate-500">
        Coloca cada dato donde va en tu forma continua. La forma es UN cheque (largo entre
        perforaciones): con ese largo el papel avanza solo al siguiente cheque. Imprime la prueba
        (2 formas) y ajusta hasta que caiga bien.
      </p>

      <button
        onClick={() => setDragModalOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-5 py-3 font-semibold text-brand-700 shadow-sm hover:bg-brand-100"
      >
        <Move size={18} /> Calibrar arrastrando
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-8">
        <div>
          <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Posiciones
            </h2>
            <div className="grid grid-cols-[1fr_4.5rem_4.5rem_3.5rem_5.5rem] items-center gap-x-2 gap-y-2 text-sm">
              <span />
              <span className="text-xs font-semibold text-slate-400">X (mm)</span>
              <span className="text-xs font-semibold text-slate-400">Y (mm)</span>
              <span className="text-xs font-semibold text-slate-400">Tamaño</span>
              <span className="text-xs font-semibold text-slate-400">Alinear</span>
              {FIELD_ORDER.map((key) => {
                const pos = calibration.fields[key]
                return (
                  <FieldRow
                    key={key}
                    isDate={key === 'date'}
                    label={FIELD_LABELS[key]}
                    pos={pos}
                    onChange={(changes) => updateField(key, changes)}
                  />
                )
              })}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-white p-5 shadow-sm">
            <NumberField
              label="Ancho de la forma (mm)"
              value={calibration.pageWidthMm}
              onChange={(v) => patch({ pageWidthMm: v })}
            />
            <NumberField
              label="Largo de la forma (mm)"
              value={calibration.pageHeightMm}
              onChange={(v) => patch({ pageHeightMm: v })}
            />
            <NumberField
              label="Ajuste general X (mm)"
              value={calibration.offsetXMm}
              onChange={(v) => patch({ offsetXMm: v })}
            />
            <NumberField
              label="Ajuste general Y (mm)"
              value={calibration.offsetYMm}
              onChange={(v) => patch({ offsetYMm: v })}
            />
            <NumberField
              label="Separación día → mes (mm)"
              value={calibration.dateGapDayMonthMm}
              onChange={(v) => patch({ dateGapDayMonthMm: Math.max(0, v) })}
            />
            <NumberField
              label="Separación mes → año (mm)"
              value={calibration.dateGapMonthYearMm}
              onChange={(v) => patch({ dateGapMonthYearMm: Math.max(0, v) })}
            />
          </div>

          <button
            onClick={handleLoadReferenceImage}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-brand-700 shadow-sm hover:bg-slate-50"
          >
            <ImageIcon size={16} /> Cargar imagen del formato (fondo)...
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Un escaneo o foto de frente de la forma completa. Se usa solo como guía de fondo al
            calibrar; no se imprime.
          </p>
        </div>

        <div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Vista previa
            </h2>
            <ScaledPreview
              html={previewHtml}
              pageWidthMm={calibration.pageWidthMm}
              pageHeightMm={calibration.pageHeightMm}
              maxWidthPx={388}
              maxHeightPx={520}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleTestPrint}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Printer size={16} /> Imprimir 2 formas de prueba
        </button>
        <div className="flex-1" />
        {savedMessage && <span className="text-sm font-medium text-emerald-600">{savedMessage}</span>}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-brand-700"
        >
          <Save size={16} /> Guardar
        </button>
      </div>

      {dragModalOpen && (
        <DragCalibrationModal
          calibration={calibration}
          sampleText={sampleText}
          onClose={() => setDragModalOpen(false)}
          onSaved={(updated) => {
            setCalibration(updated)
            flashSaved()
          }}
        />
      )}
    </div>
  )
}

function FieldRow({
  label,
  pos,
  onChange,
  isDate
}: {
  isDate: boolean
  label: string
  pos: CalibrationSettings['fields'][FieldKey]
  onChange: (changes: Partial<CalibrationSettings['fields'][FieldKey]>) => void
}): JSX.Element {
  return (
    <>
      <span className="text-slate-700">{label}</span>
      <input
        type="number"
        step="0.5"
        value={pos.xMm}
        onChange={(e) => onChange({ xMm: Number(e.target.value) })}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        type="number"
        step="0.5"
        value={pos.yMm}
        onChange={(e) => onChange({ yMm: Number(e.target.value) })}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        type="number"
        value={pos.fontSizePt}
        onChange={(e) => onChange({ fontSizePt: Number(e.target.value) })}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      />
      {isDate ? (
        <span className="text-xs text-slate-400">conjunto</span>
      ) : (
        <select
          value={pos.align}
          onChange={(e) => onChange({ align: e.target.value as FieldAlign })}
          className="w-full rounded border border-slate-300 px-1 py-1.5 text-sm"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      )}
    </>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 0.5
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
}): JSX.Element {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
      />
    </div>
  )
}
