export type CatalogMode = 'trabajadores' | 'ejidatarios'

const STORAGE_KEY = 'catalog-mode'

export function loadMode(): CatalogMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ejidatarios' ? 'ejidatarios' : 'trabajadores'
  } catch {
    return 'trabajadores'
  }
}

export function saveMode(mode: CatalogMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // sin persistencia no crítico
  }
}

export function modeTitle(mode: CatalogMode): string {
  return mode === 'ejidatarios' ? 'Ejidatarios' : 'Trabajadores'
}

export function modeSingular(mode: CatalogMode): string {
  return mode === 'ejidatarios' ? 'Ejidatario' : 'Trabajador'
}
