import { useEffect, useState } from 'react'
import { Edit3, Trash2, Users, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useDialogs } from '../components/Dialogs'
import { CatalogMode, modeSingular, modeTitle } from '../lib/mode'
import type { Worker, Ejidatario } from '@shared/types'

type Person = Worker | Ejidatario

interface WorkersViewProps {
  mode: CatalogMode
}

export default function WorkersView({ mode }: WorkersViewProps): JSX.Element {
  const { alert, confirm, prompt } = useDialogs()
  const [people, setPeople] = useState<Person[]>([])
  const [newName, setNewName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [mode])

  async function refresh(): Promise<void> {
    const api = mode === 'ejidatarios' ? window.api.ejidatarios : window.api.workers
    setPeople(await api.listAll())
  }

  async function handleAdd(): Promise<void> {
    const name = newName.trim()
    if (!name) return
    try {
      const api = mode === 'ejidatarios' ? window.api.ejidatarios : window.api.workers
      await api.add(name)
      setNewName('')
      await refresh()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function handleRename(person: Person): Promise<void> {
    const newValue = await prompt('Nuevo nombre:', person.name, true)
    if (newValue === null || !newValue.trim()) return
    try {
      const api = mode === 'ejidatarios' ? window.api.ejidatarios : window.api.workers
      await api.rename(person.id, newValue.trim())
      await refresh()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function handleDelete(person: Person): Promise<void> {
    if (
      !(await confirm(
        `¿Eliminar a ${person.name}? Ya no aparecerá en el catálogo. Sus cheques del historial se conservan.`
      ))
    )
      return
    const api = mode === 'ejidatarios' ? window.api.ejidatarios : window.api.workers
    await api.delete(person.id)
    setSelectedId(null)
    await refresh()
  }

  const selected = people.find((p) => p.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-3xl px-10 py-9">
      <div className="mb-7 flex items-center gap-3">
        <Users className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">{modeTitle(mode)}</h1>
      </div>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          value={newName}
          placeholder={`Nombre del ${modeSingular(mode).toLowerCase()}`}
          onChange={(e) => setNewName(e.target.value.toLocaleUpperCase('es-MX'))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700"
        >
          <UserPlus size={18} /> Agregar
        </button>
      </div>

      <ul className="min-h-[16rem] rounded-lg bg-white p-2 shadow-sm">
        {people.length === 0 && (
          <li className="px-4 py-6 text-center text-slate-400">
            Sin {modeTitle(mode).toLowerCase()} todavía.
          </li>
        )}
        {people.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => setSelectedId(p.id)}
              className={`flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-base ${
                selectedId === p.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'
              }`}
            >
              {p.active ? (
                <UserCheck size={18} className="text-brand-500" />
              ) : (
                <UserX size={18} className="text-slate-400" />
              )}
              <span className={p.active ? '' : 'text-slate-400'}>
                {p.name}
                {!p.active && '  ·  inactivo'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-3">
        <button
          disabled={!selected}
          onClick={() => selected && handleRename(selected)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <Edit3 size={16} /> Renombrar
        </button>
        <button
          disabled={!selected}
          onClick={() => selected && handleDelete(selected)}
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-3 font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={16} /> Eliminar
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Selecciona un {modeSingular(mode).toLowerCase()} de la lista para renombrarlo o eliminarlo.
        Eliminarlo no borra sus cheques del historial.
      </p>
    </div>
  )
}
