import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Slider,
  Switch,
  addToast
} from '@heroui/react'
import { Printer, Save, Settings } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useDialogs } from '../components/Dialogs'
import { errorMessage } from '../lib/errors'
import { FONT_CATALOG } from '@shared/fonts'
import { ensureFontsLoaded } from '../lib/fonts'
import type { CalibrationSettings, DriverPaper, PrintFont, PrintLevel, PrintMode } from '@shared/types'

const MODES: { value: PrintMode; label: string; hint: string }[] = [
  {
    value: 'windows',
    label: 'Windows (letra de la computadora)',
    hint: 'Imprime con Arial o Cambria: se ve más suave y moderna. Usa la Epson con su driver normal.'
  },
  {
    value: 'escp',
    label: 'Directo a la impresora',
    hint: 'Usa la letra que trae la impresora (más cuadrada). Necesita la impresora "Generic / Text Only".'
  }
]

const FONTS: { value: PrintFont; label: string; hint: string }[] = [
  {
    value: 'roman',
    label: 'Roman (con patines)',
    hint: 'Con patines. En modo Windows es Cambria, la letra que se usaba en el Excel.'
  },
  { value: 'sans', label: 'Sans Serif / Arial', hint: 'Sin patines, moderna. En modo Windows es Arial.' },
  { value: 'draft', label: 'Borrador', hint: 'La más rápida; letra sencilla de puntos.' }
]

const LEVELS: { value: PrintLevel; label: string; hint: string }[] = [
  { value: 1, label: 'Normal', hint: 'Una pasada, sin refuerzo.' },
  { value: 2, label: 'Oscura', hint: 'Una pasada con refuerzo (negrita).' },
  { value: 3, label: 'Intermedia', hint: 'Dos pasadas; la segunda más ligera. Queda entre Oscura y Más oscura.' },
  { value: 4, label: 'Más oscura', hint: 'Dos pasadas con refuerzo.' },
  { value: 5, label: 'Máxima', hint: 'Tres pasadas con refuerzo. Gasta más cinta.' }
]

const SAMPLE = 'RICARDO SANCHEZ SARABIA   3,388.80'
const AUTO_KEY = '__auto__'

const radioCard = {
  base:
    'm-0 inline-flex w-full max-w-none cursor-pointer flex-row-reverse items-start justify-between gap-4 rounded-2xl border-2 border-transparent bg-surface-muted/60 p-4 transition-colors hover:bg-surface-muted data-[selected=true]:border-brand-500 data-[selected=true]:bg-brand-50',
  wrapper: 'mt-1',
  labelWrapper: 'ml-0'
}

const selectClasses = { trigger: 'bg-surface-muted shadow-none' }

function NumberField({
  label,
  value,
  step,
  onChange
}: {
  label: string
  value: number
  step: number
  onChange: (n: number) => void
}): JSX.Element {
  return (
    <Input
      type="number"
      label={label}
      labelPlacement="outside"
      radius="lg"
      step={step}
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      classNames={{ inputWrapper: 'bg-surface-muted shadow-none' }}
    />
  )
}

export default function SettingsView(): JSX.Element {
  const { alert } = useDialogs()
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])

  useEffect(() => {
    ensureFontsLoaded()
    window.api.calibration.load().then(setCalibration)
    window.api.calibration.listPrinters().then(setPrinters)
  }, [])

  if (!calibration) return <div className="px-10 py-9 text-ink-500">Cargando…</div>

  function patch(changes: Partial<CalibrationSettings>): void {
    setCalibration((prev) => (prev ? { ...prev, ...changes } : prev))
  }

  async function handleSave(): Promise<void> {
    if (!calibration) return
    // Se guarda sobre lo que hay en disco para no pisar cambios hechos en Calibración.
    const current = await window.api.calibration.load()
    await window.api.calibration.save({
      ...current,
      printFont: calibration.printFont,
      printLevel: calibration.printLevel,
      boldEnabled: calibration.boldEnabled,
      windowsFont: calibration.windowsFont,
      printMode: calibration.printMode,
      printerName: calibration.printerName,
      windowsPrinterName: calibration.windowsPrinterName,
      driverPaper: calibration.driverPaper,
      winOffsetXMm: calibration.winOffsetXMm,
      winOffsetYMm: calibration.winOffsetYMm,
      batchOffsetYMm: calibration.batchOffsetYMm
    })
    addToast({ title: 'Ajustes guardados', color: 'success', timeout: 2500 })
  }

  async function handleTest(): Promise<void> {
    if (!calibration) return
    try {
      await window.api.print.fontTest(calibration)
      await alert(
        calibration.printMode === 'windows'
          ? 'Se envió una hoja de prueba con una línea. En modo Windows el papel avanza una hoja completa. ' +
              'Si sale muy clara, sube la intensidad y prueba de nuevo.'
          : 'Se envió una línea de prueba con esta letra e intensidad. Revísala en la impresora; ' +
              'si sale muy clara, sube la intensidad y prueba de nuevo.'
      )
    } catch (err) {
      await alert(`No se pudo imprimir la prueba:\n${(err as Error).message}`)
    }
  }

  const isWindows = calibration.printMode === 'windows'
  const currentPrinter = (isWindows ? calibration.windowsPrinterName : calibration.printerName) ?? AUTO_KEY
  const bold = calibration.boldEnabled && calibration.printLevel >= 2

  return (
    <div className="mx-auto max-w-4xl px-10 py-9">
      <PageHeader
        icon={Settings}
        title="Ajustes"
        subtitle="Cómo se imprime el cheque: modo, letra e intensidad."
        action={
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
        }
      />

      <div className="space-y-6">
        <section className="card p-7">
          <h2 className="mb-1 text-[1.0625rem] font-semibold text-ink-900">Modo de impresión</h2>
          <p className="mb-4 text-[14px] text-ink-500">Cómo se manda el cheque a la impresora.</p>
          <RadioGroup
            aria-label="Modo de impresión"
            value={calibration.printMode}
            onValueChange={(v) => patch({ printMode: v as PrintMode })}
            classNames={{ wrapper: 'gap-3' }}
          >
            {MODES.map((m) => (
              <Radio key={m.value} value={m.value} description={m.hint} classNames={radioCard}>
                <span className="font-semibold text-ink-900">{m.label}</span>
              </Radio>
            ))}
          </RadioGroup>

          <Select
            className="mt-10"
            label={isWindows ? 'Impresora (modo Windows)' : 'Impresora (modo directo)'}
            labelPlacement="outside"
            radius="lg"
            disallowEmptySelection
            selectedKeys={[currentPrinter]}
            onSelectionChange={(keys) => {
              const key = String(Array.from(keys)[0] ?? AUTO_KEY)
              const value = key === AUTO_KEY ? null : key
              patch(isWindows ? { windowsPrinterName: value } : { printerName: value })
            }}
            classNames={selectClasses}
          >
            {[
              <SelectItem key={AUTO_KEY}>
                {isWindows ? '(Automática: la Epson)' : '(Elige la impresora)'}
              </SelectItem>,
              ...printers.map((p) => <SelectItem key={p.name}>{p.displayName}</SelectItem>)
            ]}
          </Select>

          {isWindows && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Select
                label="Hoja del driver"
                labelPlacement="outside"
                radius="lg"
                disallowEmptySelection
                selectedKeys={[calibration.driverPaper]}
                onSelectionChange={(keys) =>
                  patch({ driverPaper: String(Array.from(keys)[0] ?? 'A4') as DriverPaper })
                }
                classNames={selectClasses}
              >
                <SelectItem key="A4">A4 (como en el Excel)</SelectItem>
                <SelectItem key="Letter">Carta</SelectItem>
              </Select>
              <NumberField
                label="Ajuste X (mm)"
                step={0.5}
                value={calibration.winOffsetXMm}
                onChange={(n) => patch({ winOffsetXMm: n })}
              />
              <NumberField
                label="Ajuste Y (mm)"
                step={0.5}
                value={calibration.winOffsetYMm}
                onChange={(n) => patch({ winOffsetYMm: n })}
              />
              <p className="col-span-3 text-[12.5px] leading-relaxed text-ink-400">
                Ajuste X / Y: mueve todo el cheque solo en modo Windows (positivo = a la derecha / hacia
                abajo). Coloca el papel como lo haces al imprimir desde Excel: el borde de arriba del primer
                cheque al inicio de la hoja. Los cheques se reparten en hojas del driver; en una tanda caben
                unos 9 (si no caben, la app avisa antes de imprimir).
              </p>
            </div>
          )}
        </section>

        <section className="card p-7">
          <h2 className="mb-1 text-[1.0625rem] font-semibold text-ink-900">Tandas (varios cheques a la vez)</h2>
          <p className="mb-4 text-[14px] text-ink-500">
            Si al imprimir varios cheques toda la tanda sale un poco corrida hacia arriba o abajo (aunque
            uno solo salga bien), corrígelo aquí. Solo se aplica cuando imprimes 2 o más cheques y mueve
            todos por igual, sin cambiar la separación entre ellos.
          </p>
          <div className="flex items-end gap-5">
            <div className="w-64">
              <NumberField
                label="Ajuste vertical en tandas (mm)"
                step={0.1}
                value={calibration.batchOffsetYMm}
                onChange={(n) => patch({ batchOffsetYMm: n })}
              />
            </div>
            <p className="pb-2 text-[12.5px] text-ink-400">
              Positivo = baja la tanda; negativo = la sube. Si sale 1 mm arriba, pon 1.
            </p>
          </div>
        </section>

        <section className="card p-7">
          <h2 className="mb-1 text-[1.0625rem] font-semibold text-ink-900">Letra</h2>
          {isWindows ? (
            <>
              <p className="mb-4 text-[14px] text-ink-500">
                Elige la letra con que se imprime el cheque. Todas se ven modernas, sin aspecto de máquina
                de escribir; las marcadas &quot;incluida&quot; vienen con la app y se ven igual en
                cualquier computadora.
              </p>
              <RadioGroup
                aria-label="Letra del modo Windows"
                value={calibration.windowsFont}
                onValueChange={(v) => patch({ windowsFont: v })}
                classNames={{ wrapper: 'grid grid-cols-2 gap-3' }}
              >
                {FONT_CATALOG.map((f) => (
                  <Radio key={f.id} value={f.id} classNames={{ ...radioCard, label: 'w-full' }}>
                    <span className="block w-full">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900">{f.label}</span>
                        {f.bundled && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                            incluida
                          </span>
                        )}
                      </span>
                      <span
                        className="mt-2 block truncate text-[15px] text-ink-900"
                        style={{ fontFamily: `${f.family}, ${f.fallback}`, fontWeight: bold ? 700 : 400 }}
                      >
                        {SAMPLE}
                      </span>
                    </span>
                  </Radio>
                ))}
              </RadioGroup>
            </>
          ) : (
            <>
              <p className="mb-4 text-[14px] text-ink-500">
                En modo directo la impresora usa las letras que trae grabadas.
              </p>
              <RadioGroup
                aria-label="Letra de la impresora"
                value={calibration.printFont}
                onValueChange={(v) => patch({ printFont: v as PrintFont })}
                classNames={{ wrapper: 'gap-3' }}
              >
                {FONTS.map((f) => (
                  <Radio key={f.value} value={f.value} description={f.hint} classNames={radioCard}>
                    <span className="font-semibold text-ink-900">{f.label}</span>
                  </Radio>
                ))}
              </RadioGroup>
            </>
          )}
        </section>

        <section className="card p-7">
          <h2 className="mb-1 text-[1.0625rem] font-semibold text-ink-900">Intensidad (qué tan oscura sale)</h2>
          <p className="mb-6 text-[14px] text-ink-500">
            {isWindows
              ? 'Mueve la barra: a la derecha la letra sale más gruesa y oscura.'
              : 'Mueve la barra: a la derecha la impresora marca cada letra más veces. Con menos pasadas hay menos riesgo de que se note un leve desfase.'}
          </p>
          <Slider
            aria-label="Intensidad"
            size="md"
            step={1}
            minValue={1}
            maxValue={5}
            showSteps
            color="primary"
            value={calibration.printLevel}
            onChange={(v) => patch({ printLevel: (Array.isArray(v) ? v[0] : v) as PrintLevel })}
            marks={LEVELS.map((l) => ({ value: l.value, label: l.label }))}
            classNames={{ mark: 'mt-1 text-[12px] text-ink-500', track: 'h-2' }}
            className="px-3 pb-6"
          />
          <p className="mt-2 rounded-2xl bg-brand-50 px-5 py-3.5 text-[14px] text-brand-800">
            <span className="font-semibold">{LEVELS[calibration.printLevel - 1].label}:</span>{' '}
            {isWindows
              ? 'grosor de la letra ' + (bold ? 'reforzado.' : 'normal.')
              : LEVELS[calibration.printLevel - 1].hint}
          </p>

          <div className="mt-5 rounded-2xl bg-surface-muted/60 p-4">
            <Switch isSelected={calibration.boldEnabled} onValueChange={(v) => patch({ boldEnabled: v })}>
              <span className="block font-semibold text-ink-900">Letra en negrita</span>
              <span className="block text-[13px] font-normal text-ink-500">
                Desactívala para que la letra salga fina (peso normal) pero conservando el mismo color
                oscuro de la intensidad.
              </span>
            </Switch>
          </div>

          <Alert
            className="mt-5"
            color="default"
            variant="flat"
            radius="lg"
            description='Si aun en "Máxima" sale clara, revisa la cinta (puede estar gastada) y la palanca de grosor del papel de la impresora: con formas de varias copias debe ir en una posición más abierta.'
          />
        </section>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <Button
          variant="flat"
          radius="full"
          startContent={<Printer size={16} />}
          className="h-12 px-6 font-semibold"
          onPress={handleTest}
        >
          Imprimir línea de prueba
        </Button>
        <p className="text-[12.5px] text-ink-400">
          Se imprime con lo que está elegido aunque no lo hayas guardado todavía, y usa solo una línea de
          papel.
        </p>
      </div>
    </div>
  )
}
