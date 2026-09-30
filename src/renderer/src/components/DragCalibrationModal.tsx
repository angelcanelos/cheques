import { useEffect, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { ImageOff, Save, X } from 'lucide-react'
import type { CalibrationSettings, FieldKey } from '@shared/types'

const FIELD_LABELS: Record<FieldKey, string> = {
  payeeName: 'Nombre',
  amountNumeric: 'Monto (número)',
  amountWords: 'Monto en letras',
  date: 'Fecha'
}

const FIELD_ORDER: FieldKey[] = ['payeeName', 'amountNumeric', 'amountWords', 'date']

const PT_TO_MM = 0.3528

interface DragCalibrationModalProps {
  calibration: CalibrationSettings
  sampleText: Record<FieldKey, string>
  onClose: () => void
  onSaved: (calibration: CalibrationSettings) => void
}

const round1 = (n: number): number => Math.round(n * 10) / 10

export default function DragCalibrationModal({
  calibration,
  sampleText,
  onClose,
  onSaved
}: DragCalibrationModalProps): JSX.Element {
  const [fields, setFields] = useState(calibration.fields)
  const [selected, setSelected] = useState<FieldKey | null>(null)
  const [pxPerMm, setPxPerMm] = useState(2.6)
  const [background, setBackground] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.calibration.referenceImageDataUrl(calibration).then(setBackground)
  }, [calibration])

  const canvasWidthPx = calibration.pageWidthMm * pxPerMm
  const canvasHeightPx = calibration.pageHeightMm * pxPerMm

  function move(key: FieldKey, xMm: number, yMm: number): void {
    setFields((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        xMm: Math.max(0, round1(xMm)),
        yMm: Math.max(0, round1(yMm))
      }
    }))
  }

  // Flechas del teclado: mueven el dato elegido 0.5 mm (1 mm con Mayús) para el ajuste fino.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (!selected) return
    const step = e.shiftKey ? 1 : 0.5
    const pos = fields[selected]
    if (e.key === 'ArrowLeft') move(selected, pos.xMm - step, pos.yMm)
    else if (e.key === 'ArrowRight') move(selected, pos.xMm + step, pos.yMm)
    else if (e.key === 'ArrowUp') move(selected, pos.xMm, pos.yMm - step)
    else if (e.key === 'ArrowDown') move(selected, pos.xMm, pos.yMm + step)
    else return
    e.preventDefault()
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
      <div className="flex max-h-full w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Calibrar arrastrando</h2>
            <p className="text-sm text-slate-500">
              Arrastra cada dato al lugar correcto de la forma. Para afinar, toca un dato y usa las
              flechas del teclado (0.5 mm; con Mayús, 1 mm).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-2.5 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            Zoom
            <input
              type="range"
              min={1.5}
              max={5}
              step={0.1}
              value={pxPerMm}
              onChange={(e) => setPxPerMm(Number(e.target.value))}
            />
          </label>
          {selected && (
            <span className="font-medium text-brand-700">
              {FIELD_LABELS[selected]}: X {fields[selected].xMm} mm · Y {fields[selected].yMm} mm
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            {!background && <ImageOff size={14} />}
            {background
              ? 'Fondo: imagen del formato'
              : 'Sin imagen de fondo (cárgala en Calibración)'}
          </span>
        </div>

        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex justify-center overflow-auto p-6 outline-none"
        >
          <div
            className="relative shrink-0 select-none rounded border-2 border-dashed border-slate-300 bg-white shadow-inner"
            style={{ width: canvasWidthPx, height: canvasHeightPx }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null)
            }}
          >
            {background && (
              <img
                src={background}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
              />
            )}
            {FIELD_ORDER.map((key) => {
              const pos = fields[key]
              const fontSizePx = pos.fontSizePt * PT_TO_MM * pxPerMm
              const isSelected = selected === key
              return (
                <Draggable
                  key={key}
                  bounds="parent"
                  position={{ x: pos.xMm * pxPerMm, y: pos.yMm * pxPerMm }}
                  onStart={() => {
                    setSelected(key)
                    containerRef.current?.focus()
                  }}
                  onDrag={(_e, data) => move(key, data.x / pxPerMm, data.y / pxPerMm)}
                  onStop={(_e, data) => move(key, data.x / pxPerMm, data.y / pxPerMm)}
                >
                  <div className="absolute cursor-move">
                    <div
                      className={`whitespace-nowrap rounded border bg-brand-50/80 px-1 font-medium text-slate-900 ring-1 hover:bg-brand-100 ${
                        isSelected
                          ? 'border-brand-600 ring-brand-500'
                          : 'border-brand-400 ring-brand-200'
                      }`}
                      style={{
                        fontSize: Math.max(fontSizePx, 9),
                        fontWeight: pos.bold ? 700 : 500,
                        transform: `translateX(${
                          key !== 'date' && pos.align === 'center'
                            ? '-50%'
                            : key !== 'date' && pos.align === 'right'
                              ? '-100%'
                              : '0'
                        })`
                      }}
                      title={FIELD_LABELS[key]}
                    >
                      {key === 'date' ? (
                        <>
                          <span>{sampleText.date.split(' ')[0]}</span>
                          <span style={{ marginLeft: calibration.dateGapDayMonthMm * pxPerMm }}>
                            {sampleText.date.split(' ')[1]}
                          </span>
                          <span style={{ marginLeft: calibration.dateGapMonthYearMm * pxPerMm }}>
                            {sampleText.date.split(' ')[2]}
                          </span>
                        </>
                      ) : (
                        sampleText[key]
                      )}
                    </div>
                  </div>
                </Draggable>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            Forma: {calibration.pageWidthMm} × {calibration.pageHeightMm} mm
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
