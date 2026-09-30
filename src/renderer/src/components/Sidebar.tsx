import logo from '../assets/logo.png'
import { FileText, History, Printer, Settings, SlidersHorizontal, Users } from 'lucide-react'
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

export default function Sidebar({
  active,
  onSelect,
  pendingCount,
  mode,
  onModeChange
}: SidebarProps): JSX.Element {
  return (
    <nav className="flex w-64 shrink-0 flex-col bg-white py-4">
      <div className="mb-3 border-b border-slate-100 px-5 pb-4">
        <img src={logo} alt="Forestal Tezains" className="w-full" draggable={false} />
      </div>

      <button
        onClick={() => onSelect('write')}
        className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
          active === 'write'
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <FileText size={20} strokeWidth={2} />
        <span className="flex-1">Emitir Cheque</span>
      </button>
      <button
        onClick={() => onSelect('print')}
        className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
          active === 'print'
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Printer size={20} strokeWidth={2} />
        <span className="flex-1">Imprimir</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onSelect('workers')}
        className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
          active === 'workers'
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Users size={20} strokeWidth={2} />
        <span className="flex-1">{modeTitle(mode)}</span>
      </button>
      <button
        onClick={() => onSelect('history')}
        className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
          active === 'history'
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <History size={20} strokeWidth={2} />
        <span className="flex-1">Historial</span>
      </button>
      <button
        onClick={() => onSelect('calibration')}
        className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
          active === 'calibration'
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <SlidersHorizontal size={20} strokeWidth={2} />
        <span className="flex-1">Calibración</span>
      </button>
      <button
        onClick={() => onSelect('settings')}
        className={`flex items-center gap-3 px-6 py-4 text-left text-[15px] transition ${
          active === 'settings'
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Settings size={20} strokeWidth={2} />
        <span className="flex-1">Ajustes</span>
      </button>

      <div className="mt-auto px-4 pt-4">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => onModeChange('trabajadores')}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
              mode === 'trabajadores'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Trabajadores
          </button>
          <button
            onClick={() => onModeChange('ejidatarios')}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
              mode === 'ejidatarios'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Ejidatarios
          </button>
        </div>
      </div>
    </nav>
  )
}
