import { useEffect, useState } from 'react'
import { Edit3, Users, UserCheck, UserPlus, UserX } from 'lucide-react'
import type { Worker } from '@shared/types'

export default function WorkersView(): JSX.Element {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [newName, setNewName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh(): Promise<void> {
    setWorkers(await window.api.workers.listAll())
  }

  async function handleAdd(): Promise<void> {
    const name = newName.trim()
    if (!name) return
    try {
      await window.api.workers.add(name)
      setNewName('')
      await refresh()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function handleRename(worker: Worker): Promise<void> {
    const newValue = prompt('Nuevo nombre:', worker.name)
    if (newValue === null || !newValue.trim()) return
    try {
      await window.api.workers.rename(worker.id, newValue.trim())
      await refresh()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function handleToggleActive(worker: Worker): Promise<void> {
    await window.api.workers.setActive(worker.id, !worker.active)
    await refresh()
  }

  const selected = workers.find((w) => w.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-3xl px-10 py-9">
      <div className="mb-7 flex items-center gap-3">
        <Users className="text-brand-600" size={30} />
        <h1 className="text-2xl font-bold text-slate-900">Trabajadores</h1>
      </div>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          value={newName}
          placeholder="Nombre del trabajador"
          onChange={(e) => setNewName(e.target.value)}
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
        {workers.length === 0 && (
          <li className="px-4 py-6 text-center text-slate-400">Sin trabajadores todavía.</li>
        )}
        {workers.map((w) => (
          <li key={w.id}>
            <button
              onClick={() => setSelectedId(w.id)}
              className={`flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-base ${
                selectedId === w.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'
              }`}
            >
              {w.active ? (
                <UserCheck size={18} className="text-brand-500" />
              ) : (
                <UserX size={18} className="text-slate-400" />
              )}
              <span className={w.active ? '' : 'text-slate-400'}>
                {w.name}
                {!w.active && '  ·  inactivo'}
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
          onClick={() => selected && handleToggleActive(selected)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {selected && !selected.active ? (
            <>
              <UserCheck size={16} /> Reactivar
            </>
          ) : (
            <>
              <UserX size={16} /> Desactivar
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Selecciona un trabajador de la lista para renombrarlo o desactivarlo. Desactivar no borra
        su historial de cheques.
      </p>
    </div>
  )
}
