import { FONT_CATALOG } from '@shared/fonts'

// Archivos de las letras incluidas en la app (resources/fonts).
const urls = import.meta.glob('../../../../resources/fonts/*.woff2', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>

let injected = false

/** Registra las letras incluidas para poder mostrarlas (p. ej. en las muestras de Ajustes). */
export function ensureFontsLoaded(): void {
  if (injected) return
  injected = true
  let css = ''
  for (const font of FONT_CATALOG) {
    if (!font.bundled || !font.file) continue
    for (const weight of [400, 700]) {
      const key = Object.keys(urls).find((k) => k.endsWith(`/${font.file}-${weight}.woff2`))
      if (key) {
        css += `@font-face{font-family:${font.family};font-weight:${weight};font-style:normal;src:url(${urls[key]}) format('woff2');}\n`
      }
    }
  }
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
