import { useEffect, useState } from 'react'
import { CheckCircle2, Printer, Save, Settings } from 'lucide-react'
import { useDialogs } from '../components/Dialogs'
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

export default function SettingsView(): JSX.Element {
  const { alert } = useDialogs()
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])

  useEffect(() => {
    ensureFontsLoaded()
    window.api.calibration.load().then(setCalibration)
    window.api.calibration.listPrinters().then(setPrinters)
  }, [])

  if (!calibration) return <div className="px-10 py-9 text-slate-500">Cargando…</div>

  function patch(changes: Partial<CalibrationSettings>): void {
    setSaved(false)
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
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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

  return (
    <div className="mx-auto max-w-3xl px-10 py-9">
      <div className="mb-7 flex items-center gap-3">
        <Settings className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Ajustes</h1>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Modo de impresión</h2>
          <p className="mb-4 text-sm text-slate-500">Cómo se manda el cheque a la impresora.</p>
          <div className="space-y-2">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                  calibration.printMode === m.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={calibration.printMode === m.value}
                  onChange={() => patch({ printMode: m.value })}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-800">{m.label}</span>
                  <span className="block text-sm text-slate-500">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <label className="mb-1 mt-5 block text-sm font-semibold text-slate-600">
            {calibration.printMode === 'windows' ? 'Impresora (modo Windows)' : 'Impresora (modo directo)'}
          </label>
          <select
            value={
              (calibration.printMode === 'windows'
                ? calibration.windowsPrinterName
                : calibration.printerName) ?? ''
            }
            onChange={(e) =>
              patch(
                calibration.printMode === 'windows'
                  ? { windowsPrinterName: e.target.value || null }
                  : { printerName: e.target.value || null }
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-base"
          >
            <option value="">
              {calibration.printMode === 'windows' ? '(Automática: la Epson)' : '(Elige la impresora)'}
            </option>
            {printers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.displayName}
              </option>
            ))}
          </select>

          {calibration.printMode === 'windows' && (
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Hoja del driver</label>
                <select
                  value={calibration.driverPaper}
                  onChange={(e) => patch({ driverPaper: e.target.value as DriverPaper })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                >
                  <option value="A4">A4 (como en el Excel)</option>
                  <option value="Letter">Carta</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Ajuste X (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={calibration.winOffsetXMm}
                  onChange={(e) => patch({ winOffsetXMm: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Ajuste Y (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={calibration.winOffsetYMm}
                  onChange={(e) => patch({ winOffsetYMm: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <p className="col-span-3 text-xs text-slate-400">
                Ajuste X / Y: mueve todo el cheque solo en modo Windows (positivo = a la derecha /
                hacia abajo). Coloca el papel como lo haces al imprimir desde Excel: el borde de arriba
                del primer cheque al inicio de la hoja. Los cheques se reparten en hojas del driver; en
                una tanda caben unos 9 (si no caben, la app avisa antes de imprimir).
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Tandas (varios cheques a la vez)</h2>
          <p className="mb-4 text-sm text-slate-500">
            Si al imprimir varios cheques toda la tanda sale un poco corrida hacia arriba o abajo
            (aunque uno solo salga bien), corrígelo aquí. Solo se aplica cuando imprimes 2 o más
            cheques y mueve todos por igual, sin cambiar la separación entre ellos.
          </p>
          <div className="flex items-end gap-4">
            <div className="w-56">
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Ajuste vertical en tandas (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={calibration.batchOffsetYMm}
                onChange={(e) => patch({ batchOffsetYMm: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <p className="pb-2 text-xs text-slate-400">
              Positivo = baja la tanda; negativo = la sube. Si sale 1 mm arriba, pon 1.
            </p>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Letra</h2>
          {calibration.printMode === 'windows' ? (
            <>
              <p className="mb-4 text-sm text-slate-500">
                Elige la letra con que se imprime el cheque. Todas se ven modernas, sin aspecto de
                máquina de escribir; las marcadas &quot;incluida&quot; vienen con la app y se ven igual
                en cualquier computadora.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FONT_CATALOG.map((f) => (
                  <label
                    key={f.id}
                    className={`flex cursor-pointer flex-col rounded-lg border px-4 py-3 ${
                      calibration.windowsFont === f.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="winfont"
                        checked={calibration.windowsFont === f.id}
                        onChange={() => patch({ windowsFont: f.id })}
                      />
                      <span className="font-semibold text-slate-800">{f.label}</span>
                      {f.bundled && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                          incluida
                        </span>
                      )}
                    </span>
                    <span
                      className="mt-2 truncate text-[15px] text-slate-900"
                      style={{
                        fontFamily: `${f.family}, ${f.fallback}`,
                        fontWeight:
                          calibration.boldEnabled && calibration.printLevel >= 2 ? 700 : 400
                      }}
                    >
                      {SAMPLE}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">
                En modo directo la impresora usa las letras que trae grabadas.
              </p>
              <div className="space-y-2">
                {FONTS.map((f) => (
                  <label
                    key={f.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                      calibration.printFont === f.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="font"
                      checked={calibration.printFont === f.value}
                      onChange={() => patch({ printFont: f.value })}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-slate-800">{f.label}</span>
                      <span className="block text-sm text-slate-500">{f.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Intensidad (qué tan oscura sale)</h2>
          <p className="mb-5 text-sm text-slate-500">
            {calibration.printMode === 'windows'
              ? 'Mueve la barra: a la derecha la letra sale más gruesa y oscura.'
              : 'Mueve la barra: a la derecha la impresora marca cada letra más veces. Con menos pasadas hay menos riesgo de que se note un leve desfase.'}
          </p>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={calibration.printLevel}
            onChange={(e) => patch({ printLevel: Number(e.target.value) as PrintLevel })}
            className="w-full accent-blue-700"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => patch({ printLevel: l.value })}
                className={`w-1/5 text-center ${
                  calibration.printLevel === l.value ? 'font-bold text-brand-700' : 'hover:text-slate-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <span className="font-semibold">{LEVELS[calibration.printLevel - 1].label}:</span>{' '}
            {calibration.printMode === 'windows'
              ? 'grosor de la letra ' +
                (calibration.boldEnabled && calibration.printLevel >= 2 ? 'reforzado.' : 'normal.')
              : LEVELS[calibration.printLevel - 1].hint}
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={calibration.boldEnabled}
              onChange={(e) => patch({ boldEnabled: e.target.checked })}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-slate-800">Letra en negrita</span>
              <span className="block text-sm text-slate-500">
                Desactívala para que la letra salga fina (peso normal) pero conservando el mismo
                color oscuro de la intensidad.
              </span>
            </span>
          </label>

          <p className="mt-4 text-xs text-slate-400">
            Si aun en &quot;Máxima&quot; sale clara, revisa la cinta (puede estar gastada) y la
            palanca de grosor del papel de la impresora: con formas de varias copias debe ir en una
            posición más abierta.
          </p>
        </section>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleTest}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Printer size={16} /> Imprimir línea de prueba
        </button>
        <div className="flex-1" />
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <CheckCircle2 size={16} /> Guardado
          </span>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-brand-700"
        >
          <Save size={16} /> Guardar
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        La línea de prueba se imprime con lo que está elegido aunque no lo hayas guardado todavía, y
        usa solo una línea de papel.
      </p>
    </div>
  )
}
