import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: ReactNode
}

/** Encabezado de pantalla del sistema de diseño: ícono en recuadro, título grande y subtítulo. */
export default function PageHeader({ icon: Icon, title, subtitle, action }: PageHeaderProps): JSX.Element {
  return (
    <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon size={24} strokeWidth={1.9} />
        </span>
        <div>
          <h1 className="m-0 text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-ink-900">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}
