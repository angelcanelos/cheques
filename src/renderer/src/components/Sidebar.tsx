import logo from '../assets/logo.png'
import { FileText, History, Printer, Settings, SlidersHorizontal, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CatalogMode } from '../lib/mode'
import { modeTitle } from '../lib/mode'

export type ViewKey = 'write' | 'print' | 'workers' | 'history' | 'calibration' | 'settings'

interface SidebarProps {
  active: ViewKey
  onSelect: (key: ViewKey) => void
  pendingCount: number
  mode: CatalogMode
  onModeChange: (mode: CatalogMode) => void
}

interface NavItem {
  key: ViewKey
  label: string
  icon: LucideIcon
  badge?: number
}

export default function Sidebar({
  active,
  onSelect,
  pendingCount,
  mode,
  onModeChange
}: SidebarProps): JSX.Element {
  const items: NavItem[] = [
    { key: 'write', label: 'Emitir Cheque', icon: FileText },
    { key: 'print', label: 'Imprimir', icon: Printer, badge: pendingCount },
    { key: 'workers', label: modeTitle(mode), icon: Users },
    { key: 'history', label: 'Historial', icon: History },
    { key: 'calibration', label: 'Calibración', icon: SlidersHorizontal },
    { key: 'settings', label: 'Ajustes', icon: Settings }
  ]

  return (
    <aside className="flex h-full w-[284px] flex-none flex-col border-r border-surface-border bg-white py-6">
      <div className="mb-8 px-7">
        <img src={logo} alt="Forestal Tezains" className="w-full object-contain" draggable={false} />
      </div>

      <nav className="flex flex-col gap-1.5 px-4">
        {items.map(({ key, label, icon: Icon, badge }) => {
          const isActive = key === active
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[15px] transition-colors ${
                isActive
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-ink-600 hover:bg-surface-muted hover:text-ink-900'
              }`}
            >
              <Icon className="h-[19px] w-[19px] flex-none" strokeWidth={1.9} />
              <span className="flex-1">{label}</span>
              {badge !== undefined && badge > 0 ? (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {badge}
                </span>
              ) : (
                isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto px-5 pt-4">
        <div className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          Catálogo
        </div>
        <div className="flex rounded-full bg-surface-muted p-1">
          {(['trabajadores', 'ejidatarios'] as CatalogMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition-all ${
                mode === m
                  ? 'bg-brand-600 text-white shadow-boton'
                  : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {modeTitle(m)}
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-[12px] text-ink-400">Forestal Tezains</p>
      </div>
    </aside>
  )
}
