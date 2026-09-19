import { useState } from 'react'
import Draggable from 'react-draggable'
import { Save, X } from 'lucide-react'
import type { CalibrationSettings, FieldKey } from '@shared/types'

const FIELD_LABELS: Record<FieldKey, string> = {
  payeeName: 'Nombre',
  amountNumeric: 'Monto (número)',
  amountWords: 'Monto en letras',
  date: 'Fecha'
}

const FIELD_ORDER: FieldKey[] = ['payeeName', 'amountNumeric', 'amountWords', 'date']

const SAMPLE_TEXT: Record<FieldKey, string> = {
  payeeName: 'NOMBRE DE PRUEBA',
  amountNumeric: '$1,234.50',
  amountWords: 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N.',
  date: '01/01/2026'
}

const CANVAS_WIDTH_PX = 860
const PT_TO_MM = 0.3528

interface DragCalibrationModalProps {
  calibration: CalibrationSettings
  onClose: () => void
  onSaved: (calibration: CalibrationSettings) => void
}

export default function DragCalibrationModal({
  calibration,
  onClose,
  onSaved
}: DragCalibrationModalProps): JSX.Element {
  const [fields, setFields] = useState(calibration.fields)
  const [saving, setSaving] = useState(false)

  const pxPerMm = CANVAS_WIDTH_PX / calibration.pageWidthMm
  const canvasHeightPx = calibration.pageHeightMm * pxPerMm

  function mmToPx(mm: number): number {
    return mm * pxPerMm
  }

  function pxToMm(px: number): number {
    return Math.round((px / pxPerMm) * 10) / 10
  }

  function handleDrag(key: FieldKey, xPx: number, yPx: number): void {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], xMm: pxToMm(xPx), yMm: pxToMm(yPx) }
    }))
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    const updated: CalibrationSettings = { ...calibration, fields }
    try {
      await window.api.calibration.save(updated)
      onSaved(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex max-h-full w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Calibrar arrastrando</h2>
            <p className="text-sm text-slate-500">
              Arrastra cada dato hasta el lugar correcto sobre el papel. Suelta y guarda cuando
              quede bien.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-center overflow-auto p-8">
          <div
            className="relative select-none rounded border-2 border-dashed border-slate-300 bg-white shadow-inner"
            style={{ width: CANVAS_WIDTH_PX, height: canvasHeightPx }}
          >
            {FIELD_ORDER.map((key) => {
              const pos = fields[key]
              const fontSizePx = pos.fontSizePt * PT_TO_MM * pxPerMm
              return (
                <Draggable
                  key={key}
                  bounds="parent"
                  position={{ x: mmToPx(pos.xMm), y: mmToPx(pos.yMm) }}
                  onDrag={(_e, data) => handleDrag(key, data.x, data.y)}
                  onStop={(_e, data) => handleDrag(key, data.x, data.y)}
                >
                  <div className="absolute cursor-move">
                    <div
                      className="group inline-flex flex-col items-start"
                      style={{ transform: 'translate(0, -100%)' }}
                    >
                      <span className="mb-0.5 whitespace-nowrap rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 shadow group-hover:opacity-100">
                        {FIELD_LABELS[key]}
                      </span>
                    </div>
                    <div
                      className="whitespace-nowrap rounded border border-brand-400 bg-brand-50/80 px-1 font-medium text-slate-900 ring-1 ring-brand-200 hover:bg-brand-100"
                      style={{
                        fontSize: Math.max(fontSizePx, 9),
                        fontWeight: pos.bold ? 700 : 500
                      }}
                    >
                      {SAMPLE_TEXT[key]}
                    </div>
                  </div>
                </Draggable>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            Ancho: {calibration.pageWidthMm} mm · Alto: {calibration.pageHeightMm} mm
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
            >
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
