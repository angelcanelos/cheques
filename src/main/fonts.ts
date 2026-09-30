import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findFont } from '../shared/fonts'

const cache = new Map<string, string>()

/**
 * CSS @font-face con la letra incluida en la app (en base64, para que funcione dentro de la
 * ventana oculta que imprime). Para letras de Windows devuelve vacío.
 */
export function fontFaceCss(fontId: string): string {
  const font = findFont(fontId)
  if (!font.bundled || !font.file) return ''
  const cached = cache.get(font.id)
  if (cached !== undefined) return cached

  const dir = join(app.getAppPath(), 'resources', 'fonts')
  let css = ''
  try {
    for (const weight of [400, 700]) {
      const data = readFileSync(join(dir, `${font.file}-${weight}.woff2`)).toString('base64')
      css += `@font-face{font-family:${font.family};font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${data}) format('woff2');}\n`
    }
  } catch {
    css = ''
  }
  cache.set(font.id, css)
  return css
}
