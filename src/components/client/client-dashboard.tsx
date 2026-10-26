import { useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { Home, Dumbbell, Calendar, UtensilsCrossed, Bell, User } from "lucide-react"
import { NotificationsPanel } from "@/components/shared/notifications-panel"
import { useNotifications } from "@/hooks/use-notifications"
import { clientService } from "@/services/client.service"
import { ClientHome } from "./client-home"
import { ClientRoutines } from "./client-routines"
import { ClientClasses } from "./client-classes"
import { ClientRecipes } from "./client-recipes"
import { ClientProfile } from "./client-profile"

interface ClientDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "rutinas" | "clases" | "recetas" | "perfil"

// La sección activa vive en la URL (/home/cliente/rutinas, /clases, /recetas, /perfil): se puede enlazar y al
// refrescar la página se mantiene. Inicio es /home/cliente. El perfil tiene UN solo camino: el ítem "Perfil" de la
// barra inferior y el avatar de arriba navegan a la misma ruta (/home/cliente/perfil).
const SECTIONS: TabType[] = ["rutinas", "clases", "recetas", "perfil"]
const pathOf = (tab: TabType) => (tab === "home" ? "/home/cliente" : `/home/cliente/${tab}`)

const NAV_ITEMS = [
  { id: "home", icon: Home, label: "Inicio" },
  { id: "rutinas", icon: Dumbbell, label: "Rutinas" },
  { id: "clases", icon: Calendar, label: "Clases" },
  { id: "recetas", icon: UtensilsCrossed, label: "Recetas" },
  { id: "perfil", icon: User, label: "Perfil" },
] as const

export function ClientDashboard({ userName, onLogout }: ClientDashboardProps) {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab: TabType = SECTIONS.includes(tab as TabType) ? (tab as TabType) : "home"
  const setActiveTab = (next: TabType) => navigate(pathOf(next))
  const [showNotifications, setShowNotifications] = useState(false)

  // Notificaciones reales del cliente autenticado (filtro y contador resueltos en el backend).
  const { unreadCount, panelProps } = useNotifications("client", {
    list: clientService.listNotifications,
    markRead: clientService.markNotificationRead,
    markAll: clientService.markAllNotificationsRead,
  })

  // Una sección inexistente (/home/cliente/algo) vuelve al inicio.
  if (tab && !SECTIONS.includes(tab as TabType)) return <Navigate to="/home/cliente" replace />

  const renderContent = () => {
    switch (activeTab) {
      case "rutinas":
        return <ClientRoutines />
      case "clases":
        return <ClientClasses />
      case "recetas":
        return <ClientRecipes />
      case "perfil":
        return <ClientProfile userName={userName} onLogout={onLogout} />
      default:
        return <ClientHome userName={userName} setActiveTab={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">FitLogic</span>
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
              aria-current={activeTab === "perfil" ? "page" : undefined}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 font-semibold text-primary-foreground"
            >
              {userName.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">{renderContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-stretch gap-0.5 px-1 py-1.5 sm:gap-1 sm:px-2">
          {NAV_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="h-5 w-5 flex-shrink-0" />
              <span className={`max-w-full truncate text-[11px] leading-none sm:text-xs ${activeTab === tab.id ? "font-bold" : "font-medium"}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} {...panelProps} />
    </div>
  )
}
