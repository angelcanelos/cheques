import { useState } from 'react'
import Sidebar, { ViewKey } from './components/Sidebar'
import WriteCheckView from './views/WriteCheckView'
import WorkersView from './views/WorkersView'
import HistoryView from './views/HistoryView'
import CalibrationView from './views/CalibrationView'

export default function App(): JSX.Element {
  const [view, setView] = useState<ViewKey>('write')

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-900">
      <Sidebar active={view} onSelect={setView} />
      <main className="flex-1 overflow-y-auto">
        {view === 'write' && <WriteCheckView />}
        {view === 'workers' && <WorkersView />}
        {view === 'history' && <HistoryView />}
        {view === 'calibration' && <CalibrationView />}
      </main>
    </div>
  )
}
