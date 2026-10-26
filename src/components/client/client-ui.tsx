import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getErrorMessage } from "@/utils/get-error-message"

interface QueryLike {
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

// Estados de carga y error (con el mensaje real del backend y botón de reintentar) de cualquier consulta.
export function QueryState({ query, label = "Cargando...", fallback, children }: { query: QueryLike; label?: string; fallback: string; children: ReactNode }) {
  if (query.isLoading) return <LoadingSpinner label={label} />
  if (query.isError) {
    return (
      <div role="alert" className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
        <p className="text-sm text-red-500">{getErrorMessage(query.error, fallback)}</p>
        <button type="button" onClick={() => query.refetch()} className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70">
          Reintentar
        </button>
      </div>
    )
  }
  return <>{children}</>
}

export function EmptyBlock({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
      <p className="flex-1 text-sm text-red-500">{message}</p>
      <button type="button" onClick={onClose} className="text-xs font-medium text-red-500 underline">
        Cerrar
      </button>
    </div>
  )
}
