import { useEffect, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { ImageOff, Save } from 'lucide-react'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Slider
} from '@heroui/react'
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
    <Modal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      size="4xl"
      scrollBehavior="inside"
      placement="center"
      backdrop="blur"
      isDismissable={false}
      classNames={{ base: 'rounded-[28px] outline-none' }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 px-7 pt-7">
          <span className="text-[1.25rem] font-semibold text-ink-900">Calibrar arrastrando</span>
          <span className="text-[13px] font-normal text-ink-500">
            Arrastra cada dato al lugar correcto de la forma. Para afinar, toca un dato y usa las flechas
            del teclado (0.5 mm; con Mayús, 1 mm).
          </span>
        </ModalHeader>

        <ModalBody className="gap-0 px-0 py-0">
          <div className="flex items-center gap-5 border-y border-surface-border bg-surface-muted/60 px-7 py-3 text-[13px] text-ink-600">
            <Slider
              aria-label="Zoom"
              label="Zoom"
              size="sm"
              step={0.1}
              minValue={1.5}
              maxValue={5}
              color="primary"
              value={pxPerMm}
              onChange={(v) => setPxPerMm(Array.isArray(v) ? v[0] : v)}
              className="w-56"
              hideValue
            />
            {selected && (
              <span className="font-medium text-brand-700">
                {FIELD_LABELS[selected]}: X {fields[selected].xMm} mm · Y {fields[selected].yMm} mm
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 text-[12px] text-ink-400">
              {!background && <ImageOff size={14} />}
              {background ? 'Fondo: imagen del formato' : 'Sin imagen de fondo (cárgala en Calibración)'}
            </span>
          </div>

          <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="flex justify-center overflow-auto p-7 outline-none"
          >
            <div
              className="relative shrink-0 select-none rounded-2xl border-2 border-dashed border-ink-200 bg-white"
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
                  className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl opacity-50"
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
                        className={`whitespace-nowrap rounded border bg-brand-50/80 px-1 font-medium text-ink-900 ring-1 hover:bg-brand-100 ${
                          isSelected ? 'border-brand-600 ring-brand-500' : 'border-brand-400 ring-brand-200'
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
        </ModalBody>

        <ModalFooter className="justify-between px-7 pb-7">
          <p className="text-[12.5px] text-ink-400">
            Forma: {calibration.pageWidthMm} × {calibration.pageHeightMm} mm
          </p>
          <div className="flex gap-3">
            <Button variant="flat" radius="full" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              radius="full"
              className="font-semibold shadow-boton"
              isLoading={saving}
              startContent={!saving && <Save size={16} />}
              onPress={handleSave}
            >
              Guardar
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
