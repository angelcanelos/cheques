import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * Diálogos propios (avisar, confirmar, pedir un texto).
 *
 * Se usan en lugar de alert/confirm/prompt del navegador porque en Electron `prompt` no
 * existe, y después de un alert/confirm nativo la ventana pierde el foco del teclado
 * (los campos dejaban de aceptar texto hasta cerrar la app).
 */
type Request =
  | { kind: 'alert'; message: string; resolve: () => void }
  | { kind: 'confirm'; message: string; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; message: string; defaultValue: string; upper: boolean; resolve: (v: string | null) => void }

interface DialogApi {
  alert: (message: string) => Promise<void>
  confirm: (message: string) => Promise<boolean>
  prompt: (message: string, defaultValue?: string, upper?: boolean) => Promise<string | null>
}

const DialogContext = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs debe usarse dentro de <DialogProvider>')
  return ctx
}

export function DialogProvider({ children }: { children: ReactNode }): JSX.Element {
  const [queue, setQueue] = useState<Request[]>([])
  const previousFocus = useRef<HTMLElement | null>(null)

  const enqueue = useCallback((req: Request) => {
    setQueue((q) => {
      if (q.length === 0) previousFocus.current = document.activeElement as HTMLElement | null
      return [...q, req]
    })
  }, [])

  const api: DialogApi = {
    alert: (message) => new Promise((resolve) => enqueue({ kind: 'alert', message, resolve })),
    confirm: (message) => new Promise((resolve) => enqueue({ kind: 'confirm', message, resolve })),
    prompt: (message, defaultValue = '', upper = false) =>
      new Promise((resolve) => enqueue({ kind: 'prompt', message, defaultValue, upper, resolve }))
  }

  const current = queue[0]

  function close(): void {
    setQueue((q) => q.slice(1))
    // Devuelve el cursor al campo que se estaba usando.
    window.setTimeout(() => previousFocus.current?.focus(), 0)
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={queue.length + current.message} request={current} onClose={close} />}
    </DialogContext.Provider>
  )
}

function DialogView({ request, onClose }: { request: Request; onClose: () => void }): JSX.Element {
  const [text, setText] = useState(request.kind === 'prompt' ? request.defaultValue : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (request.kind === 'prompt') {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      okRef.current?.focus()
    }
  }, [request])

  function accept(): void {
    if (request.kind === 'alert') request.resolve()
    else if (request.kind === 'confirm') request.resolve(true)
    else request.resolve(text)
    onClose()
  }

  function cancel(): void {
    if (request.kind === 'alert') request.resolve()
    else if (request.kind === 'confirm') request.resolve(false)
    else request.resolve(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel()
        if (e.key === 'Enter' && request.kind !== 'confirm') {
          e.preventDefault()
          accept()
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <p className="whitespace-pre-line text-base text-slate-800">{request.message}</p>
        {request.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) =>
              setText(request.upper ? e.target.value.toLocaleUpperCase('es-MX') : e.target.value)
            }
            className="mt-4 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        )}
        <div className="mt-6 flex justify-end gap-3">
          {request.kind !== 'alert' && (
            <button
              onClick={cancel}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            ref={okRef}
            onClick={accept}
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700"
          >
            {request.kind === 'alert' ? 'Entendido' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}
