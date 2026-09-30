import { useEffect, useState } from 'react'
import { CalendarDays, History, RotateCcw } from 'lucide-react'
import { centsToAmount, formatCurrency } from '../lib/currency'
import { useDialogs } from '../components/Dialogs'
import { CatalogMode, modeSingular } from '../lib/mode'
import type { CheckRecord } from '@shared/types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthAgoIso(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

interface HistoryViewProps {
  mode: CatalogMode
}

export default function HistoryView({ mode }: HistoryViewProps): JSX.Element {
  const { alert, confirm } = useDialogs()
  const [records, setRecords] = useState<CheckRecord[]>([])
  const [workerFilter, setWorkerFilter] = useState('')
  const [useDateFilter, setUseDateFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState(monthAgoIso())
  const [dateTo, setDateTo] = useState(todayIso())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [workerFilter, useDateFilter, dateFrom, dateTo, mode])

  async function refresh(): Promise<void> {
    setRecords(
      await window.api.checks.history({
        workerName: workerFilter || undefined,
        dateFrom: useDateFilter ? dateFrom : undefined,
        dateTo: useDateFilter ? dateTo : undefined,
        personType: mode
      })
    )
  }

  async function handleReprint(): Promise<void> {
    const record = records.find((r) => r.id === selectedId)
    if (!record) {
      alert('Elige un cheque de la lista primero.')
      return
    }
    if (record.status === 'pending') {
      alert('Ese cheque todavía está pendiente: imprímelo desde la sección "Imprimir".')
      return
    }
    if (!(await confirm(`¿Reimprimir el cheque de ${record.workerName}? Sale en una forma nueva.`))) return
    try {
      await window.api.print.reprint(record.id)
      await refresh()
    } catch (err) {
      alert(`No se pudo reimprimir el cheque:\n${(err as Error).message}`)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-10 py-9">
      <div className="mb-7 flex items-center gap-3">
        <History className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Historial de Cheques</h1>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={workerFilter}
          placeholder={`Filtrar por ${modeSingular(mode).toLowerCase()}`}
          onChange={(e) => setWorkerFilter(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={() => setUseDateFilter((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold shadow-sm ${
            useDateFilter
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <CalendarDays size={18} /> Filtrar por fecha
        </button>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm"
        />
        <span className="text-slate-500">a</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">{modeSingular(mode)}</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Impreso el</th>
              <th className="px-4 py-3">Reimpresiones</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Sin cheques en este rango.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`cursor-pointer border-t border-slate-100 ${
                  selectedId === r.id ? 'bg-brand-50' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-4 py-3">{r.checkDate}</td>
                <td className="px-4 py-3 font-medium">{r.workerName}</td>
                <td className="px-4 py-3">{formatCurrency(centsToAmount(r.amountCents))}</td>
                <td className="px-4 py-3">
                  {r.status === 'pending' ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Pendiente
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Impreso
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {r.printedAt ? new Date(r.printedAt).toLocaleString('es-MX') : '—'}
                </td>
                <td className="px-4 py-3">{r.reprintCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={handleReprint}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700"
        >
          <RotateCcw size={18} /> Reimprimir
        </button>
      </div>
    </div>
  )
}
