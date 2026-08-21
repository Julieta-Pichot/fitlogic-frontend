import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { X, Bell, CreditCard, Calendar, UserCheck, AlertTriangle, Star } from "lucide-react"

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

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications?: NotificationItem[]
}

const defaultNotifications: NotificationItem[] = [
  {
    id: 1,
    type: "payment",
    title: "Cuota próxima a vencer",
    message: "Tu membresía vence en 3 días. Renová para no perder acceso.",
    time: "Hace 2 horas",
    read: false,
    icon: CreditCard,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: 2,
    type: "class",
    title: "Clase confirmada",
    message: "Tu inscripción a Spinning Intensivo del 15/03 fue confirmada.",
    time: "Hace 5 horas",
    read: false,
    icon: Calendar,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: 3,
    type: "rating",
    title: "Puntuá tu clase",
    message: "Tu clase de Pilates del 08/03 ya pasó. Dejanos tu puntuación.",
    time: "Ayer",
    read: false,
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: 4,
    type: "account",
    title: "Cuenta habilitada",
    message: "Tu pago fue confirmado y tu cuenta está activa nuevamente.",
    time: "Ayer",
    read: true,
    icon: UserCheck,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: 5,
    type: "apto",
    title: "Apto físico próximo a vencer",
    message: "Tu apto físico vence en 30 días. Recordá actualizarlo.",
    time: "Hace 3 días",
    read: true,
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
]

export function NotificationsPanel({ isOpen, onClose, notifications }: NotificationsPanelProps) {
  const items = notifications ?? defaultNotifications
  const [filter, setFilter] = useState<"all" | "unread">("all")

  if (!isOpen) return null

  const visibleItems = filter === "unread" ? items.filter((n) => !n.read) : items

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Notificaciones</h2>
          </div>
          <button
            onClick={onClose}
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
          {visibleItems.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No hay notificaciones</p>
          ) : (
            visibleItems.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer ${
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <button className="w-full py-2 text-primary text-sm font-medium hover:bg-primary/10 rounded-lg transition-colors">
            Marcar todas como leídas
          </button>
        </div>
      </div>
    </div>
  )
}
