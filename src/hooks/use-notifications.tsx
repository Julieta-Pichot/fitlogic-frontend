import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CalendarCheck, Clock, CreditCard, FileCheck, Star } from "lucide-react"
import type { NotificationItem, NotificationsFilter } from "@/components/shared/notifications-panel"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatGymDateTime } from "@/utils/gym-time"
import type { NotificationFilter, NotificationList, TrainerNotification } from "@/types/trainer"

const NOTIFICATION_STYLES: Record<string, Pick<NotificationItem, "icon" | "color" | "bgColor">> = {
  CLASE_PROXIMA: { icon: Clock, color: "text-primary", bgColor: "bg-primary/10" },
  VENCIMIENTO_CUOTA: { icon: CreditCard, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  VENCIMIENTO_APTO_FISICO: { icon: FileCheck, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  INSCRIPCION_CLASE: { icon: CalendarCheck, color: "text-green-500", bgColor: "bg-green-500/10" },
  PUNTUAR_CLASE: { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
}

const relativeTime = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "Ahora"
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  return formatGymDateTime(iso)
}

const toPanelItem = (notification: TrainerNotification): NotificationItem => ({
  id: notification.id,
  type: notification.tipo,
  title: notification.titulo,
  message: notification.mensaje,
  time: relativeTime(notification.fechaEnvio),
  read: notification.leida,
  ...(NOTIFICATION_STYLES[notification.tipo] ?? { icon: Bell, color: "text-primary", bgColor: "bg-primary/10" }),
})

interface NotificationsApi {
  list: (filter: NotificationFilter) => Promise<NotificationList>
  markRead: (id: number) => Promise<unknown>
  markAll: () => Promise<unknown>
}

// Notificaciones reales del usuario autenticado: filtro resuelto en el backend, contador de no leídas,
// polling cada 30 s y marcar una / todas como leídas. Devuelve las props que espera NotificationsPanel.
export function useNotifications(scope: string, api: NotificationsApi) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>("todas")

  const query = useQuery({
    queryKey: [scope, "notifications", filter],
    queryFn: () => api.list(filter),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: [scope, "notifications"] })
  const markRead = useMutation({ mutationFn: api.markRead, onSuccess: refresh })
  const markAll = useMutation({ mutationFn: api.markAll, onSuccess: refresh })

  const items = (query.data?.items ?? []).map(toPanelItem)

  return {
    unreadCount: query.data?.unreadCount ?? 0,
    panelProps: {
      notifications: items,
      filter: (filter === "no_leidas" ? "unread" : "all") as NotificationsFilter,
      onFilterChange: (value: NotificationsFilter) => setFilter(value === "unread" ? "no_leidas" : "todas"),
      onItemClick: (id: number) => {
        if (items.find((item) => item.id === id)?.read === false) markRead.mutate(id)
      },
      onMarkAllRead: () => markAll.mutate(),
      markingAll: markAll.isPending,
      loading: query.isLoading,
      error: query.isError ? getErrorMessage(query.error, "No se pudieron cargar las notificaciones") : null,
      onRetry: () => query.refetch(),
    },
  }
}
