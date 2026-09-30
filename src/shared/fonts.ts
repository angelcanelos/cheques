/**
 * Catálogo de letras para el modo Windows.
 * - `bundled`: la letra viene incluida en la app (archivos en resources/fonts), así se ve igual
 *   en cualquier computadora.
 * - las demás son letras de Windows (si no existen en esa computadora se usa una parecida).
 */
export interface FontDef {
  id: string
  label: string
  /** Nombre de la familia CSS. */
  family: string
  /** Lo que se usa si la letra no está disponible. */
  fallback: string
  bundled: boolean
  /** Prefijo del archivo en resources/fonts (`<file>-400.woff2` y `<file>-700.woff2`). */
  file?: string
}

const SANS = "Arial, 'Helvetica Neue', Helvetica, sans-serif"

export const FONT_CATALOG: FontDef[] = [
  { id: 'arial', label: 'Arial', family: 'Arial', fallback: SANS, bundled: false },
  { id: 'calibri', label: 'Calibri', family: 'Calibri', fallback: SANS, bundled: false },
  { id: 'segoe', label: 'Segoe UI', family: "'Segoe UI'", fallback: SANS, bundled: false },
  { id: 'cambria', label: 'Cambria (con patines)', family: 'Cambria', fallback: "'Times New Roman', serif", bundled: false },
  { id: 'roboto', label: 'Roboto', family: 'Roboto', fallback: SANS, bundled: true, file: 'roboto' },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans'", fallback: SANS, bundled: true, file: 'open-sans' },
  { id: 'lato', label: 'Lato', family: 'Lato', fallback: SANS, bundled: true, file: 'lato' },
  { id: 'inter', label: 'Inter', family: 'Inter', fallback: SANS, bundled: true, file: 'inter' },
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', fallback: SANS, bundled: true, file: 'montserrat' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', fallback: SANS, bundled: true, file: 'poppins' },
  { id: 'nunito-sans', label: 'Nunito Sans', family: "'Nunito Sans'", fallback: SANS, bundled: true, file: 'nunito-sans' },
  { id: 'source-sans-3', label: 'Source Sans 3', family: "'Source Sans 3'", fallback: SANS, bundled: true, file: 'source-sans-3' },
  { id: 'work-sans', label: 'Work Sans', family: "'Work Sans'", fallback: SANS, bundled: true, file: 'work-sans' },
  { id: 'noto-sans', label: 'Noto Sans', family: "'Noto Sans'", fallback: SANS, bundled: true, file: 'noto-sans' },
  { id: 'fira-sans', label: 'Fira Sans', family: "'Fira Sans'", fallback: SANS, bundled: true, file: 'fira-sans' },
  { id: 'ubuntu', label: 'Ubuntu', family: 'Ubuntu', fallback: SANS, bundled: true, file: 'ubuntu' },
  { id: 'pt-sans', label: 'PT Sans', family: "'PT Sans'", fallback: SANS, bundled: true, file: 'pt-sans' }
]

export const DEFAULT_WINDOWS_FONT = 'arial'

export function findFont(id: string): FontDef {
  return FONT_CATALOG.find((f) => f.id === id) ?? FONT_CATALOG[0]
}

export function fontStack(id: string): string {
  const f = findFont(id)
  return `${f.family}, ${f.fallback}`
}
