import { FileText, History, SlidersHorizontal, Users } from 'lucide-react'

export type ViewKey = 'write' | 'workers' | 'history' | 'calibration'

const ITEMS: { key: ViewKey; label: string; icon: typeof FileText }[] = [
  { key: 'write', label: 'Emitir Cheque', icon: FileText },
  { key: 'workers', label: 'Trabajadores', icon: Users },
  { key: 'history', label: 'Historial', icon: History },
  { key: 'calibration', label: 'Calibración', icon: SlidersHorizontal }
]

interface SidebarProps {
  active: ViewKey
  onSelect: (key: ViewKey) => void
}

export default function Sidebar({ active, onSelect }: SidebarProps): JSX.Element {
  return (
    <nav className="flex w-64 shrink-0 flex-col bg-white py-4">
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
              isActive
                ? 'bg-brand-50 font-semibold text-brand-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
