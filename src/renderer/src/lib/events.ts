export const CHECKS_CHANGED = 'checks-changed'

/** Avisa a toda la app (p. ej. al contador de pendientes) que cambió la lista de cheques. */
export function notifyChecksChanged(): void {
  window.dispatchEvent(new Event(CHECKS_CHANGED))
}
