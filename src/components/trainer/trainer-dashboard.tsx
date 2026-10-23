import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, Calendar, Clock, CreditCard, Dumbbell, Home, Star, User, UtensilsCrossed } from "lucide-react"
import { NotificationsPanel, type NotificationItem, type NotificationsFilter } from "@/components/shared/notifications-panel"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatGymDateTime } from "@/utils/gym-time"
import type { NotificationFilter, TrainerNotification } from "@/types/trainer"
import { ClassFormModal } from "./class-form-modal"
import { ClassesTab } from "./classes-tab"
import { HomeTab } from "./home-tab"
import { ProfileTab } from "./profile-tab"
import { RecipeFormModal } from "./recipe-form-modal"
import { RecipesTab } from "./recipes-tab"
import { RoutineFormModal } from "./routine-form-modal"
import { RoutinesTab } from "./routines-tab"

interface TrainerDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "rutinas" | "clases" | "recetas" | "perfil"
type CreateModal = "routine" | "class" | "recipe" | null

const NAV_ITEMS: Array<{ id: TabType; icon: typeof Home; label: string }> = [
  { id: "home", icon: Home, label: "Inicio" },
  { id: "rutinas", icon: Dumbbell, label: "Rutinas" },
  { id: "clases", icon: Calendar, label: "Clases" },
  { id: "recetas", icon: UtensilsCrossed, label: "Recetas" },
  { id: "perfil", icon: User, label: "Perfil" },
]

// Actualización periódica de las notificaciones (polling).
const NOTIFICATIONS_POLL_MS = 30_000

const NOTIFICATION_STYLES: Record<string, Pick<NotificationItem, "icon" | "color" | "bgColor">> = {
  CLASE_PROXIMA: { icon: Clock, color: "text-primary", bgColor: "bg-primary/10" },
  VENCIMIENTO_CUOTA: { icon: CreditCard, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
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

export function TrainerDashboard({ userName, onLogout }: TrainerDashboardProps) {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [createModal, setCreateModal] = useState<CreateModal>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("todas")

  // El filtro TODAS / NO LEÍDAS lo resuelve el backend; el contador de no leídas viene siempre completo.
  const notificationsQuery = useQuery({
    queryKey: ["trainer", "notifications", notificationFilter],
    queryFn: () => trainerService.listNotifications(notificationFilter),
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnWindowFocus: true,
  })

  const refreshNotifications = () => queryClient.invalidateQueries({ queryKey: ["trainer", "notifications"] })

  const markRead = useMutation({ mutationFn: trainerService.markNotificationRead, onSuccess: refreshNotifications })
  const markAllRead = useMutation({ mutationFn: trainerService.markAllNotificationsRead, onSuccess: refreshNotifications })

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0
  const panelItems = (notificationsQuery.data?.items ?? []).map(toPanelItem)
  const panelFilter: NotificationsFilter = notificationFilter === "no_leidas" ? "unread" : "all"

  const closeCreateModal = () => setCreateModal(null)

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">FitLogic</span>
              <span className="ml-2 text-xs font-medium text-primary">Profesor</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : "Notificaciones"}
              className="relative rounded-xl bg-secondary p-2 transition-colors hover:bg-secondary/80"
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("perfil")}
              aria-label="Ir al perfil"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 font-semibold text-primary-foreground"
            >
              {userName.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {activeTab === "home" && (
          <HomeTab
            userName={userName}
            onCreateRoutine={() => setCreateModal("routine")}
            onCreateClass={() => setCreateModal("class")}
            onCreateRecipe={() => setCreateModal("recipe")}
            onSeeClasses={() => setActiveTab("clases")}
          />
        )}
        {activeTab === "rutinas" && <RoutinesTab onCreate={() => setCreateModal("routine")} />}
        {activeTab === "clases" && <ClassesTab onCreate={() => setCreateModal("class")} />}
        {activeTab === "recetas" && <RecipesTab onCreate={() => setCreateModal("recipe")} />}
        {activeTab === "perfil" && <ProfileTab onLogout={onLogout} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all ${
                activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={panelItems}
        filter={panelFilter}
        onFilterChange={(filter) => setNotificationFilter(filter === "unread" ? "no_leidas" : "todas")}
        onItemClick={(id) => {
          if (panelItems.find((item) => item.id === id)?.read === false) markRead.mutate(id)
        }}
        onMarkAllRead={() => markAllRead.mutate()}
        markingAll={markAllRead.isPending}
        loading={notificationsQuery.isLoading}
        error={notificationsQuery.isError ? getErrorMessage(notificationsQuery.error, "No se pudieron cargar las notificaciones") : null}
        onRetry={() => notificationsQuery.refetch()}
      />

      {createModal === "routine" && <RoutineFormModal onClose={closeCreateModal} />}
      {createModal === "class" && <ClassFormModal onClose={closeCreateModal} />}
      {createModal === "recipe" && <RecipeFormModal onClose={closeCreateModal} />}
    </div>
  )
}
