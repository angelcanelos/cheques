import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast
} from '@heroui/react'
import { Image as ImageIcon, Move, Printer, Save, SlidersHorizontal } from 'lucide-react'
import type { CalibrationSettings, FieldAlign, FieldKey, PrintableCheck } from '@shared/types'
import { amountToPesosText } from '@shared/amountToWords'
import { formatCheckAmount, formatWordsLine, splitCheckDate } from '@shared/format'
import DragCalibrationModal from '../components/DragCalibrationModal'
import PageHeader from '../components/PageHeader'
import ScaledPreview from '../components/ScaledPreview'
import { useDialogs } from '../components/Dialogs'
import { errorMessage } from '../lib/errors'

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

const inputClasses = { inputWrapper: 'h-10 min-h-10 bg-surface-muted shadow-none px-3', input: 'text-[14px]' }

function NumberField({
  label,
  bare,
  value,
  onChange,
  step = 0.5,
  className
}: {
  label?: string
  bare?: boolean
  value: number
  onChange: (value: number) => void
  step?: number
  className?: string
}): JSX.Element {
  return (
    <Input
      type="number"
      aria-label={label ?? 'Número'}
      label={bare ? undefined : label}
      labelPlacement={!bare && label ? 'outside' : undefined}
      radius="lg"
      size="sm"
      step={step}
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      className={className}
      classNames={inputClasses}
    />
  )
}

export default function CalibrationView(): JSX.Element {
  const { alert } = useDialogs()
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [dragModalOpen, setDragModalOpen] = useState(false)

  useEffect(() => {
    window.api.calibration.load().then(setCalibration)
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
    return <div className="px-10 py-9 text-ink-500">Cargando calibración…</div>
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
    addToast({ title: 'Los cambios se guardaron correctamente', color: 'success', timeout: 2500 })
  }

  async function handleLoadReferenceImage(): Promise<void> {
    const path = await window.api.calibration.pickReferenceImage()
    if (path) patch({ referenceImagePath: path })
  }

  async function handleTestPrint(): Promise<void> {
    if (!calibration) return
    if (calibration.printMode === 'escp' && !calibration.printerName) {
      await alert('Elige primero la impresora en Ajustes.')
      return
    }
    try {
      await window.api.print.testPage(calibration)
    } catch (err) {
      await alert(`No se pudo imprimir la prueba:\n${(err as Error).message}`)
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
    <div className="mx-auto max-w-[1400px] px-10 py-9">
      <PageHeader
        icon={SlidersHorizontal}
        title="Calibración de impresión"
        subtitle="Coloca cada dato donde va en tu forma continua. La forma es UN cheque (largo entre perforaciones)."
        action={
          <>
            <Button
              variant="flat"
              color="primary"
              radius="full"
              size="lg"
              startContent={<Move size={18} />}
              className="h-12 px-6 font-semibold"
              onPress={() => setDragModalOpen(true)}
            >
              Calibrar arrastrando
            </Button>
            <Button
              color="primary"
              radius="full"
              size="lg"
              startContent={<Save size={18} />}
              className="h-12 px-6 font-semibold shadow-boton"
              onPress={handleSave}
            >
              Guardar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Posiciones
            </h2>
            <Table
              aria-label="Posiciones de los datos"
              removeWrapper
              classNames={{
                th: 'bg-transparent text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500 border-b border-surface-border',
                td: 'py-2.5'
              }}
            >
              <TableHeader>
                <TableColumn>DATO</TableColumn>
                <TableColumn width={110}>X (MM)</TableColumn>
                <TableColumn width={110}>Y (MM)</TableColumn>
                <TableColumn width={100}>TAMAÑO</TableColumn>
                <TableColumn width={150}>ALINEAR</TableColumn>
              </TableHeader>
              <TableBody>
                {FIELD_ORDER.map((key) => {
                  const pos = calibration.fields[key]
                  return (
                    <TableRow key={key}>
                      <TableCell className="text-[14px] font-medium text-ink-900">{FIELD_LABELS[key]}</TableCell>
                      <TableCell>
                        <NumberField
                          bare
                          label={`${FIELD_LABELS[key]} X`}
                          value={pos.xMm}
                          onChange={(n) => updateField(key, { xMm: n })}
                        />
                      </TableCell>
                      <TableCell>
                        <NumberField
                          bare
                          label={`${FIELD_LABELS[key]} Y`}
                          value={pos.yMm}
                          onChange={(n) => updateField(key, { yMm: n })}
                        />
                      </TableCell>
                      <TableCell>
                        <NumberField
                          bare
                          label={`${FIELD_LABELS[key]} tamaño`}
                          step={1}
                          value={pos.fontSizePt}
                          onChange={(n) => updateField(key, { fontSizePt: n })}
                        />
                      </TableCell>
                      <TableCell>
                        {key === 'date' ? (
                          <span className="text-[13px] text-ink-400">conjunto</span>
                        ) : (
                          <Select
                            aria-label={`${FIELD_LABELS[key]} alineación`}
                            size="sm"
                            radius="lg"
                            disallowEmptySelection
                            selectedKeys={[pos.align]}
                            onSelectionChange={(keys) =>
                              updateField(key, { align: String(Array.from(keys)[0] ?? 'left') as FieldAlign })
                            }
                            classNames={{ trigger: 'h-10 min-h-10 bg-surface-muted shadow-none' }}
                          >
                            <SelectItem key="left">Izquierda</SelectItem>
                            <SelectItem key="center">Centro</SelectItem>
                            <SelectItem key="right">Derecha</SelectItem>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="card grid grid-cols-2 gap-x-5 gap-y-6 p-6">
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

          <div className="card p-6">
            <Button
              variant="flat"
              radius="full"
              startContent={<ImageIcon size={16} />}
              className="font-semibold"
              onPress={handleLoadReferenceImage}
            >
              Cargar imagen del formato (fondo)...
            </Button>
            <p className="mt-3 text-[13px] text-ink-500">
              Un escaneo o foto de frente de la forma completa. Se usa solo como guía de fondo al calibrar; no
              se imprime.
            </p>
          </div>
        </div>

        <div className="space-y-5 xl:sticky xl:top-8">
          <div className="panel-lista p-5">
            <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Vista previa
            </h2>
            <div className="flex justify-center">
              <ScaledPreview
                html={previewHtml}
                pageWidthMm={calibration.pageWidthMm}
                pageHeightMm={calibration.pageHeightMm}
                maxWidthPx={410}
                maxHeightPx={560}
              />
            </div>
          </div>
          <Button
            variant="flat"
            radius="full"
            size="lg"
            startContent={<Printer size={16} />}
            className="h-12 w-full font-semibold"
            onPress={handleTestPrint}
          >
            Imprimir 2 formas de prueba
          </Button>
        </div>
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
