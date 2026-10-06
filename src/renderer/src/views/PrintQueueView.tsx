import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip
} from '@heroui/react'
import type { Selection } from '@heroui/react'
import { Printer, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { centsToAmount, formatCurrency } from '../lib/currency'
import { notifyChecksChanged } from '../lib/events'
import { useDialogs } from '../components/Dialogs'
import { CatalogMode, modeSingular } from '../lib/mode'
import type { CalibrationSettings, CheckRecord } from '@shared/types'

interface PrintQueueViewProps {
  mode: CatalogMode
}

const AUTO_KEY = '__auto__'

export default function PrintQueueView({ mode }: PrintQueueViewProps): JSX.Element {
  const { confirm } = useDialogs()
  const [pending, setPending] = useState<CheckRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [calibration, setCalibration] = useState<CalibrationSettings | null>(null)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null)

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

  function handleSelection(keys: Selection): void {
    setSelected(keys === 'all' ? new Set(pending.map((c) => c.id)) : new Set(Array.from(keys, String)))
  }

  const currentPrinter =
    (calibration?.printMode === 'windows' ? calibration.windowsPrinterName : calibration?.printerName) ?? null

  async function handlePrinterChange(name: string | null): Promise<void> {
    if (!calibration) return
    const updated =
      calibration.printMode === 'windows'
        ? { ...calibration, windowsPrinterName: name }
        : { ...calibration, printerName: name }
    setCalibration(updated)
    await window.api.calibration.save(updated)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!(await confirm('¿Eliminar este cheque pendiente? No se imprimirá.', true))) return
    await window.api.checks.deletePending(id)
    await reload()
  }

  async function handleQuickTest(): Promise<void> {
    if (!calibration?.printerName) return
    try {
      await window.api.print.quickTest(calibration.printerName)
      setMessage({
        kind: 'success',
        text: 'Se envió una línea de prueba. Debe imprimirse "PRUEBA - CHEQUES APP" (gasta solo una línea).'
      })
    } catch (err) {
      setMessage({ kind: 'danger', text: `No se pudo enviar la prueba: ${(err as Error).message}` })
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
        kind: 'success',
        text: `Se enviaron ${count} cheque${count === 1 ? '' : 's'} a la impresora (${count} forma${
          count === 1 ? '' : 's'
        }).`
      })
      await reload()
    } catch (err) {
      setMessage({ kind: 'danger', text: `No se pudo imprimir: ${(err as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-10 py-9">
      <PageHeader
        icon={Printer}
        title="Imprimir cheques"
        subtitle={`${pending.length} pendiente${pending.length === 1 ? '' : 's'} por imprimir.`}
        action={
          <Button
            color="primary"
            radius="full"
            size="lg"
            isLoading={busy}
            isDisabled={toPrint.length === 0 || needsPrinter}
            startContent={!busy && <Printer size={20} />}
            className="h-14 px-7 font-semibold shadow-boton"
            onPress={handlePrint}
          >
            {busy ? 'Imprimiendo…' : `Imprimir ${toPrint.length} cheque${toPrint.length === 1 ? '' : 's'}`}
          </Button>
        }
      />

      <div className="card mb-6 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Impresora"
            labelPlacement="outside"
            radius="lg"
            size="lg"
            disallowEmptySelection
            selectedKeys={[currentPrinter ?? AUTO_KEY]}
            onSelectionChange={(keys) => {
              const key = String(Array.from(keys)[0] ?? AUTO_KEY)
              handlePrinterChange(key === AUTO_KEY ? null : key)
            }}
            className="max-w-md flex-1"
            classNames={{ trigger: 'bg-surface-muted shadow-none' }}
          >
            {[
              <SelectItem key={AUTO_KEY}>
                {calibration?.printMode === 'escp' ? '(Elige la impresora)' : '(Automática: la Epson)'}
              </SelectItem>,
              ...printers.map((p) => <SelectItem key={p.name}>{p.displayName}</SelectItem>)
            ]}
          </Select>
          {calibration?.printMode === 'escp' && (
            <Button
              variant="flat"
              radius="full"
              isDisabled={!calibration.printerName}
              onPress={handleQuickTest}
            >
              Probar conexión (1 línea)
            </Button>
          )}
        </div>
        <p className="mt-4 text-[13px] text-ink-500">
          {calibration?.printMode === 'windows'
            ? 'Modo Windows: imprime con la letra de la computadora, sin abrir ventanas. '
            : 'Si no sale nada, en Windows crea una impresora con el driver "Generic / Text Only" en el mismo puerto USB y elígela aquí. '}
          Antes de imprimir, acomoda la forma continua con el borde superior del primer cheque a la altura
          del cabezal. Se imprime un cheque por forma y el papel avanza solo al siguiente.
        </p>
      </div>

      {needsPrinter && (
        <Alert color="warning" variant="flat" radius="lg" className="mb-5" title="Elige la impresora para poder imprimir." />
      )}

      <div className="panel-lista p-3 sm:p-4">
        <Table
          aria-label="Cheques pendientes"
          removeWrapper
          isHeaderSticky
          selectionMode="multiple"
          color="primary"
          selectedKeys={selected}
          onSelectionChange={handleSelection}
          classNames={{
            base: 'max-h-[520px] overflow-auto',
            th: 'bg-transparent text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500 border-b border-surface-border',
            td: 'py-3.5 text-[15px]',
            tr: 'transition-colors data-[hover=true]:bg-brand-50/50'
          }}
        >
          <TableHeader>
            <TableColumn>FECHA</TableColumn>
            <TableColumn>{modeSingular(mode).toUpperCase()}</TableColumn>
            <TableColumn>MONTO</TableColumn>
            <TableColumn width={60} align="end">
              {' '}
            </TableColumn>
          </TableHeader>
          <TableBody
            items={pending}
            emptyContent='No hay cheques pendientes. Guárdalos desde "Emitir Cheque".'
          >
            {(c) => {
              const index = pending.findIndex((x) => x.id === c.id)
              return (
                <TableRow key={c.id}>
                  <TableCell>{c.checkDate.split('-').reverse().join('/')}</TableCell>
                  <TableCell className="font-medium text-ink-900">
                    <span className="mr-2 text-ink-400">{index + 1}.</span>
                    {c.workerName}
                  </TableCell>
                  <TableCell>{formatCurrency(centsToAmount(c.amountCents))}</TableCell>
                  <TableCell>
                    <Tooltip content="Eliminar" color="danger" closeDelay={0}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        radius="full"
                        color="danger"
                        aria-label="Eliminar cheque pendiente"
                        onPress={() => handleDelete(c.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            }}
          </TableBody>
        </Table>
      </div>

      {message && (
        <Alert
          color={message.kind}
          variant="flat"
          radius="lg"
          className="mt-5"
          title={message.text}
          isClosable
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  )
}
