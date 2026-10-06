import { useCallback, useEffect, useState } from 'react'
import Sidebar, { ViewKey } from './components/Sidebar'
import WriteCheckView from './views/WriteCheckView'
import PrintQueueView from './views/PrintQueueView'
import WorkersView from './views/WorkersView'
import HistoryView from './views/HistoryView'
import CalibrationView from './views/CalibrationView'
import SettingsView from './views/SettingsView'
import { CHECKS_CHANGED } from './lib/events'
import { CatalogMode, loadMode, saveMode } from './lib/mode'

export default function App(): JSX.Element {
  const [view, setView] = useState<ViewKey>('write')
  const [pendingCount, setPendingCount] = useState(0)
  const [mode, setMode] = useState<CatalogMode>(loadMode)

  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  const refreshPending = useCallback(async (): Promise<void> => {
    setPendingCount((await window.api.checks.listPending(mode)).length)
  }, [mode])

  useEffect(() => {
    refreshPending()
    window.addEventListener(CHECKS_CHANGED, refreshPending)
    return () => window.removeEventListener(CHECKS_CHANGED, refreshPending)
  }, [refreshPending])

  function handleModeChange(next: CatalogMode): void {
    setMode(next)
    saveMode(next)
  }

  return (
    <div className="fondo-app flex h-screen w-screen text-ink-900">
      <Sidebar
        active={view}
        onSelect={setView}
        pendingCount={pendingCount}
        mode={mode}
        onModeChange={handleModeChange}
      />
      <main className="flex-1 overflow-y-auto">
        {view === 'write' && <WriteCheckView mode={mode} />}
        {view === 'print' && <PrintQueueView mode={mode} />}
        {view === 'workers' && <WorkersView mode={mode} />}
        {view === 'history' && <HistoryView mode={mode} />}
        {view === 'calibration' && <CalibrationView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}
