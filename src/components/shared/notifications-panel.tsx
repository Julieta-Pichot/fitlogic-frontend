import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { X, Bell } from "lucide-react"

export interface NotificationItem {
  id: number
  type: string
  title: string
  message: string
  time: string
  read: boolean
  icon: LucideIcon
  color: string
  bgColor: string
}

export type NotificationsFilter = "all" | "unread"

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications?: NotificationItem[]
  // Modo "servidor": el filtro lo resuelve el backend, por eso lo controla el padre.
  filter?: NotificationsFilter
  onFilterChange?: (filter: NotificationsFilter) => void
  onItemClick?: (id: number) => void
  onMarkAllRead?: () => void
  markingAll?: boolean
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  filter: controlledFilter,
  onFilterChange,
  onItemClick,
  onMarkAllRead,
  markingAll = false,
  loading = false,
  error = null,
  onRetry,
}: NotificationsPanelProps) {
  // Sin datos de ejemplo: si el panel no recibe notificaciones (administrador / recepción todavía no las tienen) muestra el estado vacío.
  const items = notifications ?? []
  const [localFilter, setLocalFilter] = useState<NotificationsFilter>("all")
  const serverFiltered = Boolean(onFilterChange)
  const filter = controlledFilter ?? localFilter
  const setFilter = onFilterChange ?? setLocalFilter

  if (!isOpen) return null

  const visibleItems = !serverFiltered && filter === "unread" ? items.filter((n) => !n.read) : items
  const hasUnread = items.some((n) => !n.read)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Notificaciones</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar notificaciones"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-2 border-b border-border flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            No leídas
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-140px)]">
          {loading && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Cargando notificaciones...</p>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="text-sm font-medium text-primary hover:underline">
                  Reintentar
                </button>
              )}
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              {filter === "unread" ? "No tenés notificaciones sin leer" : "No hay notificaciones"}
            </p>
          ) : (
            visibleItems.map((notification) => (
              <div
                key={notification.id}
                role={onItemClick ? "button" : undefined}
                tabIndex={onItemClick ? 0 : undefined}
                onClick={() => onItemClick?.(notification.id)}
                onKeyDown={(event) => {
                  if (onItemClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault()
                    onItemClick(notification.id)
                  }
                }}
                className={`p-4 border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-secondary/50 ${
                  !notification.read ? "bg-secondary/30" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notification.bgColor}`}>
                    <notification.icon className={`w-5 h-5 ${notification.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {onMarkAllRead && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <button
            onClick={onMarkAllRead}
            disabled={markingAll || (Boolean(onMarkAllRead) && !hasUnread)}
            className="w-full py-2 text-primary text-sm font-medium hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {markingAll ? "Marcando..." : "Marcar todas como leídas"}
          </button>
        </div>
        )}
      </div>
    </div>
  )
}
