const MM_TO_PX = 96 / 25.4

interface ScaledPreviewProps {
  html: string | null
  pageWidthMm: number
  pageHeightMm: number
  maxWidthPx: number
  maxHeightPx: number
}

/** Muestra el HTML de la forma completa reducido para que quepa en el espacio disponible. */
export default function ScaledPreview({
  html,
  pageWidthMm,
  pageHeightMm,
  maxWidthPx,
  maxHeightPx
}: ScaledPreviewProps): JSX.Element {
  const fullW = pageWidthMm * MM_TO_PX
  const fullH = pageHeightMm * MM_TO_PX
  const scale = Math.min(maxWidthPx / fullW, maxHeightPx / fullH)

  return (
    <div
      className="relative overflow-hidden rounded border border-slate-200 bg-white"
      style={{ width: fullW * scale, height: fullH * scale }}
    >
      {html && (
        <iframe
          title="Vista previa"
          src={`data:text/html;charset=utf-8,${encodeURIComponent(html)}`}
          style={{
            width: fullW,
            height: fullH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none'
          }}
        />
      )}
    </div>
  )
}
