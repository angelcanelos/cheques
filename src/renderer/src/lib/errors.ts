/** Quita el prefijo técnico que Electron agrega a los errores del proceso principal. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '').trim()
}
