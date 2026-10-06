import { useEffect, useRef, useState } from 'react'
import { Button, DatePicker, Input, addToast } from '@heroui/react'
import type { DatePickerProps } from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { FileText, Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SearchableCombo from '../components/SearchableCombo'
import { useDialogs } from '../components/Dialogs'
import { amountToPesosText } from '@shared/amountToWords'
import { formatWordsLine } from '@shared/format'
import { toCents } from '../lib/currency'
import { notifyChecksChanged } from '../lib/events'
import { CatalogMode, modeSingular, modeTitle } from '../lib/mode'
import type { Ejidatario, Worker } from '@shared/types'

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

// HeroUI trae su propia copia de @internationalized/date; los tipos son equivalentes.
const toDateValue = (iso: string): DatePickerProps['value'] =>
  parseDate(iso) as unknown as DatePickerProps['value']

const FIELD_LABEL = 'mb-2 block text-[15px] font-semibold text-ink-700'

export default function WriteCheckView({ mode }: WriteCheckViewProps): JSX.Element {
  const { alert } = useDialogs()
  const [people, setPeople] = useState<Person[]>([])
  const [personName, setPersonName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
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
        `Ese nombre no está en el catálogo. Elige uno de la lista o agrégalo primero en la sección "${modeTitle(mode)}".`,
        { title: `${modeSingular(mode)} no encontrado`, tone: 'warning' }
      )
      return null
    }
    if (!amountValid) {
      alert('Escribe un monto mayor a cero para poder guardar el cheque.', {
        title: 'Falta el monto',
        tone: 'warning'
      })
      return null
    }
    return person
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
      addToast({
        title: `Cheque guardado: ${person.name}`,
        description: `${pending} pendiente${pending === 1 ? '' : 's'} por imprimir.`,
        color: 'success',
        timeout: 4000
      })
      setPersonName('')
      setAmountText('')
      setDate(todayIso())
      personInputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-8 py-9 xl:px-12">
      <PageHeader
        icon={FileText}
        title="Emitir Cheque"
        subtitle={`Escribe el nombre del ${modeSingular(mode).toLowerCase()} y el monto; Enter avanza y guarda.`}
      />

      <div>
        <div className="panel-lista space-y-8 p-8 xl:p-10">
          <div>
            <label className={FIELD_LABEL}>{modeSingular(mode)}</label>
            <SearchableCombo
              inputRef={personInputRef}
              value={personName}
              onChange={setPersonName}
              items={people.map((p) => p.name)}
              placeholder="Escribe el nombre..."
              onConfirm={() => amountInputRef.current?.focus()}
              inputClassName="form-input h-[72px] w-full rounded-2xl px-6 text-[1.5rem]"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className={FIELD_LABEL}>Monto</label>
              <Input
                ref={amountInputRef}
                aria-label="Monto"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                radius="lg"
                value={amountText}
                startContent={<span className="text-[1.5rem] text-ink-400">$</span>}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                onValueChange={(v) => {
                  if (/^[0-9]*[.,]?[0-9]{0,2}$/.test(v)) setAmountText(v)
                }}
                classNames={{
                  inputWrapper:
                    'h-[72px] rounded-2xl border-[1.5px] border-surface-border bg-white px-6 shadow-none data-[hover=true]:border-ink-200 group-data-[focus=true]:border-brand-500 group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-brand-100',
                  input: 'text-[1.5rem] font-medium'
                }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Fecha</label>
              <DatePicker
                aria-label="Fecha"
                radius="lg"
                showMonthAndYearPickers
                value={toDateValue(date)}
                onChange={(d) => d && setDate(String(d))}
                classNames={{
                  inputWrapper:
                    'h-[72px] rounded-2xl border-[1.5px] border-surface-border bg-white px-6 shadow-none data-[hover=true]:border-ink-200 group-data-[focus=true]:border-brand-500 group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-brand-100',
                  input: 'text-[1.25rem]'
                }}
                calendarProps={{ classNames: { base: 'rounded-3xl' } }}
              />
            </div>
          </div>

          <div>
            <label className={FIELD_LABEL}>Monto en letras</label>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-5 text-[1.5rem] font-semibold leading-snug text-brand-800">
              {wordsPreview}
            </div>
          </div>

          <Button
            color="primary"
            radius="full"
            size="lg"
            isLoading={busy}
            startContent={!busy && <Save size={22} />}
            className="h-16 w-full text-[1.125rem] font-semibold shadow-boton"
            onPress={handleSave}
          >
            Guardar cheque
          </Button>
        </div>

      </div>
    </div>
  )
}
