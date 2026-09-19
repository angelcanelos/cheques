import { useEffect, useMemo, useRef, useState } from 'react'

interface SearchableComboProps {
  value: string
  onChange: (value: string) => void
  items: string[]
  placeholder?: string
  /** Se dispara cuando el usuario confirma un valor (Enter o clic en una sugerencia). */
  onConfirm?: (value: string) => void
  id?: string
}

/**
 * Combo con autocompletado:
 * - Al escribir se despliega la lista de sugerencias que coinciden.
 * - Las flechas arriba/abajo navegan la lista.
 * - Enter toma la sugerencia resaltada, o si no se navegó con las flechas,
 *   toma directamente la primera coincidencia. No hace falta ir al
 *   desplegable ni usar el mouse.
 */
export default function SearchableCombo({
  value,
  onChange,
  items,
  placeholder,
  onConfirm,
  id
}: SearchableComboProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const suggestions = useMemo(() => {
    const typed = value.trim().toLowerCase()
    if (!typed) return []
    const starts = items.filter((i) => i.toLowerCase().startsWith(typed))
    const contains = items.filter(
      (i) => !i.toLowerCase().startsWith(typed) && i.toLowerCase().includes(typed)
    )
    return [...starts, ...contains].slice(0, 8)
  }, [value, items])

  useEffect(() => {
    setHighlighted(-1)
  }, [value])

  function resolveMatch(): string | null {
    const typed = value.trim()
    if (!typed) return null
    const exact = items.find((i) => i.toLowerCase() === typed.toLowerCase())
    if (exact) return null // ya está completo, no hay nada que autocompletar
    if (highlighted >= 0 && suggestions[highlighted]) return suggestions[highlighted]
    return suggestions[0] ?? null
  }

  function commit(match: string): void {
    onChange(match)
    setOpen(false)
    setHighlighted(-1)
    onConfirm?.(match)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestions.length === 0) return
      setOpen(true)
      setHighlighted((h) => (h + 1 >= suggestions.length ? 0 : h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestions.length === 0) return
      setOpen(true)
      setHighlighted((h) => (h - 1 < 0 ? suggestions.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      const match = resolveMatch()
      if (match) {
        e.preventDefault()
        commit(match)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => value.trim() && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((s, idx) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(s)}
                className={`block w-full px-4 py-2 text-left text-base ${
                  idx === highlighted ? 'bg-brand-50 text-brand-700' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
