import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Chip,
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
  TableRow
} from '@heroui/react'
import { Search, Trash2, UserPlus, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useDialogs } from '../components/Dialogs'
import { errorMessage } from '../lib/errors'
import { CatalogMode, modeSingular, modeTitle } from '../lib/mode'
import type { Ejidatario, Worker } from '@shared/types'

type Person = Worker | Ejidatario

interface WorkersViewProps {
  mode: CatalogMode
}

const PAGE_SIZES = ['10', '15', '25', '50']

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function WorkersView({ mode }: WorkersViewProps): JSX.Element {
  const { alert, confirm } = useDialogs()
  const [people, setPeople] = useState<Person[]>([])
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('10')
  const [editing, setEditing] = useState<Person | null>(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)

  const api = mode === 'ejidatarios' ? window.api.ejidatarios : window.api.workers

  useEffect(() => {
    setSearch('')
    setPage(1)
    refresh()
  }, [mode])

  async function refresh(): Promise<void> {
    setPeople(await api.listAll())
  }

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    return q ? people.filter((p) => normalize(p.name).includes(q)) : people
  }, [people, search])

  const perPage = Number(rowsPerPage)
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, pages)
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  async function handleAdd(): Promise<void> {
    const name = newName.trim()
    if (!name) return
    try {
      await api.add(name)
      setNewName('')
      setSearch('')
      await refresh()
    } catch (err) {
      const msg = errorMessage(err)
      if (msg.startsWith('Ya existe')) {
        setSearch(name)
        setPage(1)
        await alert(
          `${modeSingular(mode)} "${name}" ya está en el catálogo, así que no se agregó otra vez. Lo dejé filtrado en la lista por si quieres modificarlo.`,
          { title: `Ese ${modeSingular(mode).toLowerCase()} ya existe`, tone: 'warning' }
        )
      } else {
        await alert(msg, { title: 'No se pudo agregar', tone: 'error' })
      }
    }
  }

  function openEdit(person: Person): void {
    setEditing(person)
    setEditName(person.name)
    setEditActive(person.active)
  }

  async function handleSave(): Promise<void> {
    if (!editing) return
    const name = editName.trim()
    if (!name) return
    try {
      if (name !== editing.name) await api.rename(editing.id, name)
      if (editActive !== editing.active) await api.setActive(editing.id, editActive)
      setEditing(null)
      await refresh()
    } catch (err) {
      const msg = errorMessage(err)
      await alert(
        msg.startsWith('Ya existe')
          ? `Ya hay otro registro con el nombre "${name}". Usa un nombre distinto.`
          : msg,
        { title: msg.startsWith('Ya existe') ? 'Ese nombre ya existe' : 'No se pudo guardar', tone: msg.startsWith('Ya existe') ? 'warning' : 'error' }
      )
    }
  }

  async function handleDelete(): Promise<void> {
    if (!editing) return
    const person = editing
    setEditing(null)
    const ok = await confirm(
      `¿Eliminar a ${person.name}? Ya no aparecerá en el catálogo. Sus cheques del historial se conservan.`,
      true
    )
    if (!ok) return
    await api.delete(person.id)
    await refresh()
  }

  return (
    <div className="mx-auto max-w-5xl px-10 py-9">
      <PageHeader
        icon={Users}
        title={modeTitle(mode)}
        subtitle={`${people.length} registrados. Haz clic en una fila para modificarla o eliminarla.`}
      />

      <div className="mb-5 flex gap-3">
        <Input
          aria-label={`Nombre del ${modeSingular(mode).toLowerCase()}`}
          placeholder={`Nombre del ${modeSingular(mode).toLowerCase()}`}
          radius="full"
          size="lg"
          value={newName}
          onValueChange={(v) => setNewName(v.toLocaleUpperCase('es-MX'))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          classNames={{ inputWrapper: 'h-14 bg-white shadow-card px-5', input: 'text-[15px]' }}
        />
        <Button
          color="primary"
          radius="full"
          size="lg"
          className="h-14 px-7 font-semibold shadow-boton"
          startContent={<UserPlus size={18} />}
          onPress={handleAdd}
        >
          Agregar
        </Button>
      </div>

      <div className="panel-lista p-5 sm:p-6">
        <Input
          aria-label="Buscar"
          placeholder={`Buscar entre ${people.length} ${modeTitle(mode).toLowerCase()}…`}
          radius="full"
          isClearable
          value={search}
          onValueChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          startContent={<Search className="h-[18px] w-[18px] flex-none text-ink-500" strokeWidth={2} />}
          classNames={{
            inputWrapper:
              'h-14 bg-surface-muted shadow-none px-4 data-[hover=true]:bg-ink-100 group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-brand-100',
            input: 'text-[14px]'
          }}
        />

        <Table
          aria-label={modeTitle(mode)}
          removeWrapper
          className="mt-4"
          onRowAction={(key) => {
            const person = people.find((p) => p.id === String(key))
            if (person) openEdit(person)
          }}
          classNames={{
            th: 'bg-transparent text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500 border-b border-surface-border',
            tr: 'cursor-pointer transition-colors hover:bg-brand-100/70',
            td: 'py-3.5 text-[15px] first:rounded-l-2xl last:rounded-r-2xl'
          }}
          bottomContent={
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-3 text-[13px] text-ink-500">
                <span>
                  {filtered.length === 0
                    ? 'Sin resultados'
                    : `${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, filtered.length)} de ${filtered.length}`}
                </span>
                <Select
                  aria-label="Filas por página"
                  size="sm"
                  radius="full"
                  disallowEmptySelection
                  selectedKeys={[rowsPerPage]}
                  onSelectionChange={(keys) => {
                    setRowsPerPage(String(Array.from(keys)[0] ?? '10'))
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
            <TableColumn>NOMBRE</TableColumn>
            <TableColumn width={140}>ESTADO</TableColumn>
          </TableHeader>
          <TableBody
            items={pageItems}
            emptyContent={
              search ? 'Ningún resultado para esa búsqueda.' : `Sin ${modeTitle(mode).toLowerCase()} todavía.`
            }
          >
            {(person) => (
              <TableRow key={person.id}>
                <TableCell className={person.active ? 'font-medium text-ink-900' : 'text-ink-400'}>
                  {person.name}
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={person.active ? 'success' : 'default'}>
                    {person.active ? 'Activo' : 'Inactivo'}
                  </Chip>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        placement="center"
        backdrop="blur"
        size="lg"
        classNames={{ base: 'rounded-[28px]' }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 px-7 pt-7">
            <span className="text-[1.25rem] font-semibold text-ink-900">
              Modificar {modeSingular(mode).toLowerCase()}
            </span>
            <span className="text-[13px] font-normal text-ink-500">
              Cambia el nombre, desactívalo o elimínalo del catálogo.
            </span>
          </ModalHeader>
          <ModalBody className="gap-5 px-7">
            <Input
              autoFocus
              label="Nombre"
              labelPlacement="outside"
              placeholder="Nombre completo"
              radius="lg"
              size="lg"
              value={editName}
              onValueChange={(v) => setEditName(v.toLocaleUpperCase('es-MX'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                else if (e.key === 'Escape') setEditing(null)
              }}
              classNames={{ inputWrapper: 'bg-surface-muted', input: 'text-lg' }}
            />
            <Switch isSelected={editActive} onValueChange={setEditActive} size="sm">
              <span className="text-[14px] text-ink-800">Activo (aparece al emitir cheques)</span>
            </Switch>
          </ModalBody>
          <ModalFooter className="justify-between px-7 pb-7">
            <Button
              color="danger"
              variant="flat"
              radius="full"
              startContent={<Trash2 size={16} />}
              onPress={handleDelete}
            >
              Eliminar
            </Button>
            <div className="flex gap-3">
              <Button variant="flat" radius="full" onPress={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                color="primary"
                radius="full"
                className="font-semibold"
                isDisabled={!editName.trim()}
                onPress={handleSave}
              >
                Guardar
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
