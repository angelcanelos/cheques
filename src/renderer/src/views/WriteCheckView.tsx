import { useEffect, useRef, useState } from 'react'
import { Eye, FileText, Printer } from 'lucide-react'
import SearchableCombo from '../components/SearchableCombo'
import { amountToPesosText } from '@shared/amountToWords'
import { formatCurrency, toCents } from '../lib/currency'
import type { Worker } from '@shared/types'

function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function WriteCheckView(): JSX.Element {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerName, setWorkerName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    refreshWorkers()
  }, [])

  async function refreshWorkers(): Promise<void> {
    setWorkers(await window.api.workers.listActive())
  }

  const amountValue = amountText.trim() === '' ? 0 : Number(amountText.replace(',', '.'))
  const amountValid = Number.isFinite(amountValue) && amountValue > 0
  const wordsPreview = amountValid ? amountToPesosText(amountValue) : '—'

  function findMatchingWorker(): Worker | null {
    const typed = workerName.trim().toLowerCase()
    return workers.find((w) => w.name.trim().toLowerCase() === typed) ?? null
  }

  function resetForm(): void {
    setWorkerName('')
    setAmountText('')
    setDate(todayIso())
  }

  function validate(): Worker | null {
    const worker = findMatchingWorker()
    if (!worker) {
      alert('Ese nombre no está en el catálogo. Agrégalo primero en la sección "Trabajadores".')
      return null
    }
    if (!amountValid) {
      alert('El monto debe ser mayor a cero.')
      return null
    }
    return worker
  }

  function buildCheckData(worker: Worker) {
    return {
      payeeName: worker.name,
      amountNumericText: formatCurrency(amountValue),
      amountWordsText: amountToPesosText(amountValue),
      dateText: formatDateDisplay(date)
    }
  }

  async function handlePreview(): Promise<void> {
    const worker = validate()
    if (!worker) return
    const html = await window.api.print.preview(buildCheckData(worker))
    setPreviewUrl(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  }

  async function handlePrint(): Promise<void> {
    const worker = validate()
    if (!worker) return
    setBusy(true)
    try {
      await window.api.print.check(buildCheckData(worker))
      await window.api.checks.insert({
        workerId: worker.id,
        workerName: worker.name,
        amountCents: toCents(amountValue),
        amountWords: amountToPesosText(amountValue),
        checkDate: date
      })
      resetForm()
    } catch (err) {
      alert(`No se pudo imprimir el cheque:\n${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-10 py-9">
      <div className="mb-7 flex items-center gap-3">
        <FileText className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Emitir Cheque</h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-600">Trabajador</label>
          <SearchableCombo
            value={workerName}
            onChange={setWorkerName}
            items={workers.map((w) => w.name)}
            placeholder="Escribe el nombre..."
            onConfirm={() => amountInputRef.current?.focus()}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-600">Monto</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-slate-500">
                $
              </span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={amountText}
                placeholder="0.00"
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^[0-9]*[.,]?[0-9]{0,2}$/.test(v)) setAmountText(v)
                }}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-8 pr-4 text-lg text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-600">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-600">
            Monto en letras
          </label>
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-5 py-4 text-lg font-bold text-brand-800">
            {wordsPreview}
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 font-semibold text-brand-700 shadow-sm transition hover:bg-slate-50"
        >
          <Eye size={18} /> Vista previa
        </button>
        <button
          onClick={handlePrint}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          <Printer size={20} /> {busy ? 'Imprimiendo…' : 'Imprimir'}
        </button>
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="max-h-[80vh] w-[900px] overflow-auto rounded-xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe title="Vista previa del cheque" src={previewUrl} className="h-[350px] w-full border border-slate-200" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="mt-4 w-full rounded-lg bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
