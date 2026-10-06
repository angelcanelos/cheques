import { useEffect, useState } from 'react'
import {
  Button,
  Chip,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
  addToast
} from '@heroui/react'
import type { DatePickerProps, Selection } from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { Eye, History, RotateCcw, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { centsToAmount, formatCurrency } from '../lib/currency'
import { useDialogs } from '../components/Dialogs'
import { errorMessage } from '../lib/errors'
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

// HeroUI trae su propia copia de @internationalized/date; los tipos son equivalentes.
const toDateValue = (iso: string): DatePickerProps['value'] =>
  parseDate(iso) as unknown as DatePickerProps['value']

const PAGE_SIZES = ['8', '15', '30']

const datePickerClasses = {
  inputWrapper:
    'h-12 bg-white border-[1.5px] border-surface-border shadow-none data-[hover=true]:border-ink-200 group-data-[focus=true]:border-brand-500 group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-brand-100'
}

interface HistoryViewProps {
  mode: CatalogMode
}

export default function HistoryView({ mode }: HistoryViewProps): JSX.Element {
  const { alert, confirm } = useDialogs()
  const [records, setRecords] = useState<CheckRecord[]>([])
  const [nameFilter, setNameFilter] = useState('')
  const [useDateFilter, setUseDateFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState(monthAgoIso())
  const [dateTo, setDateTo] = useState(todayIso())
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('8')
  const [detail, setDetail] = useState<CheckRecord | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPage(1)
    setSelected(new Set())
    refresh()
  }, [nameFilter, useDateFilter, dateFrom, dateTo, mode])

  async function refresh(): Promise<CheckRecord[]> {
    const list = await window.api.checks.history({
      workerName: nameFilter || undefined,
      dateFrom: useDateFilter ? dateFrom : undefined,
      dateTo: useDateFilter ? dateTo : undefined,
      personType: mode
    })
    setRecords(list)
    return list
  }

  const perPage = Number(rowsPerPage)
  const pages = Math.max(1, Math.ceil(records.length / perPage))
  const currentPage = Math.min(page, pages)
  const pageItems = records.slice((currentPage - 1) * perPage, currentPage * perPage)

  const printed = records.filter((r) => r.status === 'printed')
  const pendingKeys = records.filter((r) => r.status === 'pending').map((r) => r.id)
  // Se reimprimen en el orden en que aparecen en la tabla.
  const chosen = printed.filter((r) => selected.has(r.id))

  function handleSelection(keys: Selection): void {
    setSelected((prev) => {
      const pageIds = new Set(pageItems.map((r) => r.id))
      const next = new Set([...prev].filter((id) => !pageIds.has(id)))
      const onPage = keys === 'all' ? pageItems.filter((r) => r.status === 'printed').map((r) => r.id) : Array.from(keys, String)
      onPage.forEach((id) => next.add(id))
      return next
    })
  }

  async function reprint(list: CheckRecord[]): Promise<void> {
    if (list.length === 0 || busy) return
    const text =
      list.length === 1
        ? `¿Reimprimir el cheque de ${list[0].workerName}? Sale en una forma nueva.`
        : `¿Reimprimir ${list.length} cheques? Sale una forma por cada uno, en el orden de la lista.`
    if (!(await confirm(text))) return
    setBusy(true)
    try {
      const count = await window.api.print.reprint(list.map((r) => r.id))
      setSelected(new Set())
      await refresh()
      addToast({
        title: `Se enviaron ${count} cheque${count === 1 ? '' : 's'} a la impresora`,
        color: 'success',
        timeout: 3500
      })
    } catch (err) {
      await alert(errorMessage(err), { title: 'No se pudo reimprimir', tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleReprintDetail(): Promise<void> {
    if (!detail) return
    const record = detail
    setDetail(null)
    await reprint([record])
  }

  return (
    <div className="mx-auto max-w-6xl px-10 py-9">
      <PageHeader
        icon={History}
        title="Historial de Cheques"
        subtitle={`${records.length} cheque${records.length === 1 ? '' : 's'}. Marca los que quieras reimprimir; puedes elegir varios.`}
        action={
          <Button
            color="primary"
            radius="full"
            size="lg"
            isLoading={busy}
            isDisabled={chosen.length === 0}
            startContent={!busy && <RotateCcw size={18} />}
            className="h-12 px-6 font-semibold shadow-boton"
            onPress={() => reprint(chosen)}
          >
            {chosen.length === 0
              ? 'Reimprimir'
              : `Reimprimir ${chosen.length} cheque${chosen.length === 1 ? '' : 's'}`}
          </Button>
        }
      />

      <div className="panel-lista p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            aria-label="Filtrar"
            placeholder={`Filtrar por ${modeSingular(mode).toLowerCase()}`}
            radius="full"
            isClearable
            value={nameFilter}
            onValueChange={setNameFilter}
            startContent={<Search className="h-[18px] w-[18px] flex-none text-ink-500" strokeWidth={2} />}
            className="min-w-[240px] flex-1"
            classNames={{
              inputWrapper:
                'h-12 bg-surface-muted shadow-none px-4 data-[hover=true]:bg-ink-100 group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-brand-100',
              input: 'text-[14px]'
            }}
          />
          <Switch isSelected={useDateFilter} onValueChange={setUseDateFilter} size="sm">
            <span className="text-[14px] text-ink-700">Filtrar por fecha</span>
          </Switch>
          {useDateFilter && (
            <>
              <DatePicker
                aria-label="Desde"
                radius="full"
                showMonthAndYearPickers
                value={toDateValue(dateFrom)}
                onChange={(d) => d && setDateFrom(String(d))}
                className="w-[180px]"
                classNames={datePickerClasses}
              />
              <span className="text-ink-500">a</span>
              <DatePicker
                aria-label="Hasta"
                radius="full"
                showMonthAndYearPickers
                value={toDateValue(dateTo)}
                onChange={(d) => d && setDateTo(String(d))}
                className="w-[180px]"
                classNames={datePickerClasses}
              />
            </>
          )}
        </div>

        <Table
          aria-label="Historial de cheques"
          removeWrapper
          className="mt-4"
          selectionMode="multiple"
          color="primary"
          selectedKeys={selected}
          onSelectionChange={handleSelection}
          disabledKeys={pendingKeys}
          classNames={{
            th: 'bg-transparent text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500 border-b border-surface-border',
            tr: 'cursor-pointer transition-colors hover:bg-brand-100/70 data-[disabled=true]:cursor-default data-[disabled=true]:hover:bg-transparent',
            td: 'py-3.5 text-[14px] first:rounded-l-2xl last:rounded-r-2xl'
          }}
          bottomContent={
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-3 text-[13px] text-ink-500">
                {printed.length > 0 && (
                  <Button
                    size="sm"
                    variant="flat"
                    radius="full"
                    onPress={() =>
                      setSelected(chosen.length === printed.length ? new Set() : new Set(printed.map((r) => r.id)))
                    }
                  >
                    {chosen.length === printed.length ? 'Quitar selección' : `Seleccionar los ${printed.length} impresos`}
                  </Button>
                )}
                <span>
                  {records.length === 0
                    ? 'Sin resultados'
                    : `${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, records.length)} de ${records.length}`}
                </span>
                <Select
                  aria-label="Filas por página"
                  size="sm"
                  radius="full"
                  disallowEmptySelection
                  selectedKeys={[rowsPerPage]}
                  onSelectionChange={(keys) => {
                    setRowsPerPage(String(Array.from(keys)[0] ?? '8'))
                    setPage(1)
                  }}
                  className="w-[150px]"
                  classNames={{ trigger: 'h-9 bg-surface-muted shadow-none' }}
                >
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n}>{`${n} por página`}</SelectItem>
                  ))}
                </Select>
              </div>
              <Pagination
                showControls
                isCompact
                radius="full"
                color="primary"
                page={currentPage}
                total={pages}
                onChange={setPage}
              />
            </div>
          }
        >
          <TableHeader>
            <TableColumn>FECHA</TableColumn>
            <TableColumn>{modeSingular(mode).toUpperCase()}</TableColumn>
            <TableColumn>MONTO</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>IMPRESO EL</TableColumn>
            <TableColumn align="center">REIMPR.</TableColumn>
            <TableColumn width={60} align="end">
              {' '}
            </TableColumn>
          </TableHeader>
          <TableBody items={pageItems} emptyContent="Sin cheques en este rango.">
            {(r) => (
              <TableRow key={r.id}>
                <TableCell>{r.checkDate.split('-').reverse().join('/')}</TableCell>
                <TableCell className="font-medium text-ink-900">{r.workerName}</TableCell>
                <TableCell>{formatCurrency(centsToAmount(r.amountCents))}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={r.status === 'pending' ? 'warning' : 'success'}>
                    {r.status === 'pending' ? 'Pendiente' : 'Impreso'}
                  </Chip>
                </TableCell>
                <TableCell className="text-ink-500">
                  {r.printedAt ? new Date(r.printedAt).toLocaleString('es-MX') : '—'}
                </TableCell>
                <TableCell>{r.reprintCount}</TableCell>
                <TableCell>
                  <Tooltip content="Ver detalle" closeDelay={0}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      radius="full"
                      aria-label="Ver detalle del cheque"
                      onPress={() => setDetail(r)}
                    >
                      <Eye size={16} />
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        placement="center"
        backdrop="blur"
        size="lg"
        classNames={{ base: 'rounded-[28px]' }}
      >
        <ModalContent>
          {detail && (
            <>
              <ModalHeader className="flex flex-col gap-1 px-7 pt-7">
                <span className="text-[1.25rem] font-semibold text-ink-900">{detail.workerName}</span>
                <span className="text-[13px] font-normal text-ink-500">
                  Cheque del {detail.checkDate.split('-').reverse().join('/')}
                </span>
              </ModalHeader>
              <ModalBody className="gap-4 px-7">
                <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-5 py-4">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                    Monto
                  </span>
                  <span className="text-[1.75rem] font-semibold text-ink-900">
                    {formatCurrency(centsToAmount(detail.amountCents))}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
                  <dt className="text-ink-500">Estado</dt>
                  <dd>
                    <Chip size="sm" variant="flat" color={detail.status === 'pending' ? 'warning' : 'success'}>
                      {detail.status === 'pending' ? 'Pendiente' : 'Impreso'}
                    </Chip>
                  </dd>
                  <dt className="text-ink-500">Impreso el</dt>
                  <dd className="text-ink-900">
                    {detail.printedAt ? new Date(detail.printedAt).toLocaleString('es-MX') : '—'}
                  </dd>
                  <dt className="text-ink-500">Reimpresiones</dt>
                  <dd className="text-ink-900">{detail.reprintCount}</dd>
                </dl>
                {detail.status === 'pending' && (
                  <p className="text-[13px] text-ink-500">
                    Este cheque todavía está pendiente: imprímelo desde la sección &quot;Imprimir&quot;.
                  </p>
                )}
              </ModalBody>
              <ModalFooter className="px-7 pb-7">
                <Button variant="flat" radius="full" onPress={() => setDetail(null)}>
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  radius="full"
                  className="font-semibold"
                  isDisabled={detail.status === 'pending'}
                  startContent={<RotateCcw size={16} />}
                  onPress={handleReprintDetail}
                >
                  Reimprimir
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
