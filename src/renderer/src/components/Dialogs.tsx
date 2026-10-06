import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter } from '@heroui/react'
import { CircleAlert, Info, Pencil, TriangleAlert } from 'lucide-react'

/**
 * Diálogos propios (avisar, confirmar, pedir un texto) hechos con el Modal de HeroUI.
 *
 * Se usan en lugar de alert/confirm/prompt del navegador porque en Electron `prompt` no
 * existe y, después de un alert/confirm nativo, la ventana pierde el foco del teclado.
 */
export interface AlertOptions {
  title?: string
  /** `warning` para avisos que el usuario puede corregir; `error` para fallas. */
  tone?: 'info' | 'warning' | 'error'
}

type Request =
  | { kind: 'alert'; message: string; options: AlertOptions; resolve: () => void }
  | { kind: 'confirm'; message: string; danger: boolean; resolve: (ok: boolean) => void }
  | {
      kind: 'prompt'
      message: string
      defaultValue: string
      upper: boolean
      resolve: (v: string | null) => void
    }

interface DialogApi {
  alert: (message: string, options?: AlertOptions) => Promise<void>
  /** `danger` pinta el botón de rojo (para eliminar). */
  confirm: (message: string, danger?: boolean) => Promise<boolean>
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
  const nextKey = useRef(0)

  const enqueue = useCallback((req: Request) => setQueue((q) => [...q, req]), [])

  const api: DialogApi = {
    alert: (message, options = {}) =>
      new Promise((resolve) => enqueue({ kind: 'alert', message, options, resolve })),
    confirm: (message, danger = false) =>
      new Promise((resolve) => enqueue({ kind: 'confirm', message, danger, resolve })),
    prompt: (message, defaultValue = '', upper = false) =>
      new Promise((resolve) => enqueue({ kind: 'prompt', message, defaultValue, upper, resolve }))
  }

  const current = queue[0]

  function close(): void {
    nextKey.current += 1
    setQueue((q) => q.slice(1))
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={nextKey.current} request={current} onClose={close} />}
    </DialogContext.Provider>
  )
}

function DialogView({ request, onClose }: { request: Request; onClose: () => void }): JSX.Element {
  const [text, setText] = useState(request.kind === 'prompt' ? request.defaultValue : '')

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

  const alertTone = request.kind === 'alert' ? (request.options.tone ?? 'info') : null
  const Icon =
    alertTone === 'error'
      ? CircleAlert
      : alertTone === 'warning'
        ? TriangleAlert
        : request.kind === 'alert'
          ? Info
          : request.kind === 'confirm'
            ? TriangleAlert
            : Pencil
  const danger = request.kind === 'confirm' && request.danger
  const tone =
    danger || alertTone === 'error'
      ? 'bg-danger-bg text-danger'
      : alertTone === 'warning' || request.kind === 'confirm'
        ? 'bg-warning-bg text-warning'
        : 'bg-brand-50 text-brand-600'
  const title = request.kind === 'alert' ? request.options.title : undefined

  return (
    <Modal
      isOpen
      onOpenChange={(open) => !open && cancel()}
      placement="center"
      backdrop="blur"
      size="md"
      classNames={{ base: 'rounded-[28px]' }}
    >
      <ModalContent>
        <ModalBody className="px-7 pb-2 pt-7">
          <div className="flex items-start gap-4">
            <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div className="flex-1 pt-1">
              {title && <h2 className="mb-1 text-[1.125rem] font-semibold text-ink-900">{title}</h2>}
              <p
                className={`whitespace-pre-line text-[15px] leading-relaxed ${
                  title ? 'text-ink-600' : 'pt-1 text-ink-800'
                }`}
              >
                {request.message}
              </p>
            </div>
          </div>
          {request.kind === 'prompt' && (
            <Input
              autoFocus
              radius="lg"
              size="lg"
              value={text}
              onValueChange={(v) => setText(request.upper ? v.toLocaleUpperCase('es-MX') : v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') accept()
                else if (e.key === 'Escape') cancel()
              }}
              classNames={{ inputWrapper: 'bg-surface-muted', input: 'text-lg' }}
            />
          )}
        </ModalBody>
        <ModalFooter className="px-7 pb-7 pt-4">
          {request.kind !== 'alert' && (
            <Button variant="flat" radius="full" onPress={cancel}>
              Cancelar
            </Button>
          )}
          <Button
            color={danger ? 'danger' : 'primary'}
            radius="full"
            className="font-semibold"
            autoFocus={request.kind !== 'prompt'}
            onPress={accept}
          >
            {request.kind === 'alert' ? 'Entendido' : danger ? 'Eliminar' : 'Aceptar'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
