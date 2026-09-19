import { useEffect, useState } from 'react'
import { Image as ImageIcon, Move, Printer, Save, SlidersHorizontal } from 'lucide-react'
import type { CalibrationSettings, FieldKey } from '@shared/types'
import DragCalibrationModal from '../components/DragCalibrationModal'

const FIELD_LABELS: Record<FieldKey, string> = {
  payeeName: 'Nombre',
  amountNumeric: 'Monto (número)',
  amountWords: 'Monto en letras',
  date: 'Fecha'
}

const FIELD_ORDER: FieldKey[] = ['payeeName', 'amountNumeric', 'amountWords', 'date']

const MM_TO_PX = 96 / 25.4
const PREVIEW_BOX_WIDTH_PX = 380

const SAMPLE_DATA = {
  payeeName: 'NOMBRE DE PRUEBA',
  amountNumericText: '$1,234.50',
  amountWordsText: 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N.',
  dateText: '01/01/2026'
}

export default function CalibrationView(): JSX.Element {
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
    ;(async () => {
      const html = await window.api.print.previewWithCalibration(SAMPLE_DATA, calibration)
      if (!cancelled) setPreviewUrl(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    })()
    return () => {
      cancelled = true
    }
  }, [calibration])

  if (!calibration) {
    return <div className="px-10 py-9 text-slate-500">Cargando calibración…</div>
  }

  function updateField(key: FieldKey, patch: Partial<CalibrationSettings['fields'][FieldKey]>): void {
    setCalibration((prev) =>
      prev
        ? { ...prev, fields: { ...prev.fields, [key]: { ...prev.fields[key], ...patch } } }
        : prev
    )
  }

  async function handleLoadReferenceImage(): Promise<void> {
    const path = await window.api.calibration.pickReferenceImage()
    if (path) {
      setCalibration((prev) => (prev ? { ...prev, referenceImagePath: path } : prev))
    }
  }

  async function handleTestPrint(): Promise<void> {
    if (!calibration) return
    try {
      await window.api.print.testPage(calibration)
    } catch (err) {
      alert(`No se pudo imprimir la página de prueba:\n${(err as Error).message}`)
    }
  }

  async function handleSave(): Promise<void> {
    if (!calibration) return
    await window.api.calibration.save(calibration)
    setSavedMessage('Los cambios se guardaron correctamente.')
    setTimeout(() => setSavedMessage(null), 2500)
  }

  return (
    <div className="px-10 py-9">
      <div className="mb-2 flex items-center gap-3">
        <SlidersHorizontal className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Calibración de impresión</h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-slate-500">
        Ajusta la posición (en milímetros) de cada dato para que caiga en el lugar correcto sobre
        el papel de cheque preimpreso. Usa &quot;Imprimir página de prueba&quot; con un cheque en
        blanco para verificar. Al imprimir siempre se abre el diálogo de Windows para elegir la
        impresora.
      </p>

      <button
        onClick={() => setDragModalOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-5 py-3 font-semibold text-brand-700 shadow-sm hover:bg-brand-100"
      >
        <Move size={18} /> Calibrar arrastrando
      </button>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Posiciones
            </h2>
            <div className="grid grid-cols-[1fr_5rem_5rem_4.5rem] items-center gap-x-3 gap-y-2 text-sm">
              <span />
              <span className="text-xs font-semibold text-slate-400">X (mm)</span>
              <span className="text-xs font-semibold text-slate-400">Y (mm)</span>
              <span className="text-xs font-semibold text-slate-400">Tamaño (pt)</span>
              {FIELD_ORDER.map((key) => {
                const pos = calibration.fields[key]
                return (
                  <FieldRow
                    key={key}
                    label={FIELD_LABELS[key]}
                    pos={pos}
                    onChange={(patch) => updateField(key, patch)}
                  />
                )
              })}
            </div>
          </div>

          <div className="mb-6 space-y-3 rounded-lg bg-white p-5 shadow-sm">
            <NumberField
              label="Ancho de página (mm)"
              value={calibration.pageWidthMm}
              onChange={(v) => setCalibration((prev) => (prev ? { ...prev, pageWidthMm: v } : prev))}
            />
            <NumberField
              label="Alto de página (mm)"
              value={calibration.pageHeightMm}
              onChange={(v) =>
                setCalibration((prev) => (prev ? { ...prev, pageHeightMm: v } : prev))
              }
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Impresora predeterminada
              </label>
              <select
                value={calibration.printerName ?? ''}
                onChange={(e) =>
                  setCalibration((prev) =>
                    prev ? { ...prev, printerName: e.target.value || null } : prev
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              >
                <option value="">(Preguntar cada vez que imprima)</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleLoadReferenceImage}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-brand-700 shadow-sm hover:bg-slate-50"
          >
            <ImageIcon size={16} /> Cargar imagen de referencia...
          </button>
          {calibration.referenceImagePath && (
            <p className="mt-2 truncate text-xs text-slate-400">
              Imagen guardada: {calibration.referenceImagePath}
            </p>
          )}
        </div>

        <div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Vista previa
            </h2>
            <div
              className="relative overflow-hidden rounded border border-slate-200 bg-white"
              style={{
                width: PREVIEW_BOX_WIDTH_PX,
                height: PREVIEW_BOX_WIDTH_PX * (calibration.pageHeightMm / calibration.pageWidthMm)
              }}
            >
              {previewUrl && (
                <iframe
                  title="Vista previa de calibración"
                  src={previewUrl}
                  style={{
                    width: calibration.pageWidthMm * MM_TO_PX,
                    height: calibration.pageHeightMm * MM_TO_PX,
                    transform: `scale(${PREVIEW_BOX_WIDTH_PX / (calibration.pageWidthMm * MM_TO_PX)})`,
                    transformOrigin: 'top left',
                    border: 'none'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleTestPrint}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Printer size={16} /> Imprimir página de prueba
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
          onClose={() => setDragModalOpen(false)}
          onSaved={(updated) => {
            setCalibration(updated)
            setSavedMessage('Los cambios se guardaron correctamente.')
            setTimeout(() => setSavedMessage(null), 2500)
          }}
        />
      )}
    </div>
  )
}

function FieldRow({
  label,
  pos,
  onChange
}: {
  label: string
  pos: CalibrationSettings['fields'][FieldKey]
  onChange: (patch: Partial<CalibrationSettings['fields'][FieldKey]>) => void
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
    </>
  )
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (value: number) => void
}): JSX.Element {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      <input
        type="number"
        step="0.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
      />
    </div>
  )
}
