import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Printer, Trash2 } from 'lucide-react'
import { centsToAmount, formatCurrency } from '../lib/currency'
import { notifyChecksChanged } from '../lib/events'
import { useDialogs } from '../components/Dialogs'
import { CatalogMode, modeSingular, modeTitle } from '../lib/mode'
import type { CalibrationSettings, CheckRecord } from '@shared/types'

interface PrintQueueViewProps {
  mode: CatalogMode
}

export default function PrintQueueView({ mode }: PrintQueueViewProps): JSX.Element {
  const { confirm } = useDialogs()
  const [pending, setPending] = useState<CheckRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const [list, cal, prn] = await Promise.all([
        window.api.checks.listPending(mode),
        window.api.calibration.load(),
        window.api.calibration.listPrinters()
      ])
      setPending(list)
      setSelected(new Set(list.map((c) => c.id)))
      setCalibration(cal)
      setPrinters(prn)
    })()
  }, [mode])

  async function reload(): Promise<void> {
    const list = await window.api.checks.listPending(mode)
    setPending(list)
    setSelected((prev) => new Set(list.filter((c) => prev.has(c.id)).map((c) => c.id)))
    notifyChecksChanged()
  }

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handlePrinterChange(name: string): Promise<void> {
    if (!calibration) return
    const updated =
      calibration.printMode === 'windows'
        ? { ...calibration, windowsPrinterName: name || null }
        : { ...calibration, printerName: name || null }
    setCalibration(updated)
    await window.api.calibration.save(updated)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!(await confirm('¿Eliminar este cheque pendiente? No se imprimirá.'))) return
    await window.api.checks.deletePending(id)
    await reload()
  }

  async function handleQuickTest(): Promise<void> {
    if (!calibration?.printerName) return
    try {
      await window.api.print.quickTest(calibration.printerName)
      setMessage({
        kind: 'ok',
        text: 'Se envió una línea de prueba. Debe imprimirse "PRUEBA - CHEQUES APP" (gasta solo una línea).'
      })
    } catch (err) {
      setMessage({ kind: 'error', text: `No se pudo enviar la prueba: ${(err as Error).message}` })
    }
  }

  const toPrint = pending.filter((c) => selected.has(c.id))
  const needsPrinter = calibration?.printMode === 'escp' && !calibration.printerName

  async function handlePrint(): Promise<void> {
    if (toPrint.length === 0 || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const count = await window.api.print.batch(toPrint.map((c) => c.id))
      setMessage({
        kind: 'ok',
        text: `Se enviaron ${count} cheque${count === 1 ? '' : 's'} a la impresora (${count} forma${
          count === 1 ? '' : 's'
        }).`
      })
      await reload()
    } catch (err) {
      setMessage({ kind: 'error', text: `No se pudo imprimir: ${(err as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-10 py-9">
      <div className="mb-7 flex items-center gap-3">
        <Printer className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Imprimir cheques</h1>
      </div>

      <div className="mb-5 rounded-lg bg-white p-5 shadow-sm">
        <label className="mb-1.5 block text-sm font-semibold text-slate-600">Impresora</label>
        <select
          value={
            (calibration?.printMode === 'windows'
              ? calibration.windowsPrinterName
              : calibration?.printerName) ?? ''
          }
          onChange={(e) => handlePrinterChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-base"
        >
          <option value="">
            {calibration?.printMode === 'escp'
              ? '(Elige la impresora)'
              : '(Automática: la Epson)'}
          </option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName}
            </option>
          ))}
        </select>
        <div className="mt-3 flex items-center gap-3">
          {calibration?.printMode === 'escp' && (
          <button
            onClick={handleQuickTest}
            disabled={!calibration?.printerName}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Probar conexión (1 línea)
          </button>
          )}
          <span className="text-xs text-slate-400">
            {calibration?.printMode === 'windows'
              ? 'Modo Windows: imprime con la letra de la computadora, sin abrir ventanas.'
              : 'Si no sale nada, en Windows crea una impresora con el driver "Generic / Text Only" en el mismo puerto USB y elígela aquí.'}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Antes de imprimir, acomoda la forma continua con el borde superior del primer cheque a la
          altura del cabezal. Se imprime un cheque por forma y el papel avanza solo al siguiente.
        </p>
      </div>

      {needsPrinter && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertTriangle size={18} /> Elige la impresora para poder imprimir.
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={pending.length > 0 && selected.size === pending.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(pending.map((c) => c.id)) : new Set())
                  }
                />
              </th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">{modeSingular(mode)}</th>
              <th className="px-4 py-3">Monto</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No hay cheques pendientes. Guárdalos desde &quot;Emitir Cheque&quot;.
                </td>
              </tr>
            )}
            {pending.map((c, index) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                </td>
                <td className="px-4 py-3">{c.checkDate.split('-').reverse().join('/')}</td>
                <td className="px-4 py-3 font-medium">
                  <span className="mr-2 text-slate-400">{index + 1}.</span>
                  {c.workerName}
                </td>
                <td className="px-4 py-3">{formatCurrency(centsToAmount(c.amountCents))}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(c.id)}
                    title="Eliminar"
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <div
          className={`mt-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            message.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handlePrint}
          disabled={toPrint.length === 0 || busy || needsPrinter}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-7 py-3.5 font-bold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={20} />
          {busy
            ? 'Imprimiendo…'
            : `Imprimir ${toPrint.length} cheque${toPrint.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
