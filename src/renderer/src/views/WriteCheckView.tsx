import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Eye, FileText, Save } from 'lucide-react'
import SearchableCombo from '../components/SearchableCombo'
import ScaledPreview from '../components/ScaledPreview'
import { useDialogs } from '../components/Dialogs'
import { amountToPesosText } from '@shared/amountToWords'
import { formatWordsLine } from '@shared/format'
import { toCents } from '../lib/currency'
import { notifyChecksChanged } from '../lib/events'
import { CatalogMode, modeSingular, modeTitle } from '../lib/mode'
import type { CalibrationSettings, Worker, Ejidatario } from '@shared/types'

function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type Person = Worker | Ejidatario

interface WriteCheckViewProps {
  mode: CatalogMode
}

export default function WriteCheckView({ mode }: WriteCheckViewProps): JSX.Element {
  const { alert } = useDialogs()
  const [people, setPeople] = useState<Person[]>([])
  const [personName, setPersonName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ html: string; calibration: CalibrationSettings } | null>(
    null
  )
  const personInputRef = useRef<HTMLInputElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const api = mode === 'ejidatarios' ? window.api.ejidatarios : window.api.workers
    api.listActive().then(setPeople)
  }, [mode])

  const amountValue = amountText.trim() === '' ? 0 : Number(amountText.replace(',', '.'))
  const amountValid = Number.isFinite(amountValue) && amountValue > 0
  const wordsPreview = amountValid ? formatWordsLine(amountToPesosText(amountValue)) : '—'

  function findMatchingPerson(): Person | null {
    const typed = personName.trim().toLowerCase()
    return people.find((p) => p.name.trim().toLowerCase() === typed) ?? null
  }

  function validate(): Person | null {
    const person = findMatchingPerson()
    if (!person) {
      alert(
        `Ese nombre no está en el catálogo. Agrégalo primero en la sección "${modeTitle(mode)}".`
      )
      return null
    }
    if (!amountValid) {
      alert('El monto debe ser mayor a cero.')
      return null
    }
    return person
  }

  async function handlePreview(): Promise<void> {
    const person = validate()
    if (!person) return
    const calibration = await window.api.calibration.load()
    const html = await window.api.print.preview(
      {
        workerName: person.name,
        amountCents: toCents(amountValue),
        amountWords: amountToPesosText(amountValue),
        checkDate: date
      },
      calibration
    )
    setPreview({ html, calibration })
  }

  async function handleSave(): Promise<void> {
    if (busy) return
    const person = validate()
    if (!person) return
    setBusy(true)
    try {
      await window.api.checks.insert({
        workerId: person.id,
        workerName: person.name,
        amountCents: toCents(amountValue),
        amountWords: amountToPesosText(amountValue),
        checkDate: date,
        personType: mode
      })
      notifyChecksChanged()
      const pending = (await window.api.checks.listPending(mode)).length
      setNotice(
        `Cheque de ${person.name} guardado. ${pending} pendiente${pending === 1 ? '' : 's'} por imprimir.`
      )
      setTimeout(() => setNotice(null), 4000)
      setPersonName('')
      setAmountText('')
      setDate(todayIso())
      personInputRef.current?.focus()
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
          <label className="mb-1.5 block text-sm font-semibold text-slate-600">
            {modeSingular(mode)}
          </label>
          <SearchableCombo
            inputRef={personInputRef}
            value={personName}
            onChange={setPersonName}
            items={people.map((p) => p.name)}
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
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
          onClick={handleSave}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          <Save size={20} /> Guardar cheque
        </button>
      </div>

      {notice && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-full flex-col items-center rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ScaledPreview
              html={preview.html}
              pageWidthMm={preview.calibration.pageWidthMm}
              pageHeightMm={preview.calibration.pageHeightMm}
              maxWidthPx={520}
              maxHeightPx={560}
            />
            <button
              onClick={() => setPreview(null)}
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
