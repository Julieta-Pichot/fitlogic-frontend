import { useState } from "react"
import {
  Home,
  Dumbbell,
  Calendar,
  UtensilsCrossed,
  Bell,
  Flame,
  ChevronRight,
  Pencil,
  Check,
} from "lucide-react"
import { ClientRoutines } from "./client-routines"
import { ClientClasses } from "./client-classes"
import { ClientRecipes } from "./client-recipes"
import { ClientProfile } from "./client-profile"
import { NotificationsPanel } from "@/components/shared/notifications-panel"

interface ClientDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "rutinas" | "clases" | "recetas" | "perfil"

export function ClientDashboard({ userName, onLogout }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [showNotifications, setShowNotifications] = useState(false)

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
        return <HomeContent userName={userName} setActiveTab={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">FitLogic</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                3
              </span>
            </button>
            <button
              onClick={() => setActiveTab("perfil")}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold"
            >
              {userName.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">{renderContent()}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-2">
          {[
            { id: "home", icon: Home, label: "Inicio" },
            { id: "rutinas", icon: Dumbbell, label: "Rutinas" },
            { id: "clases", icon: Calendar, label: "Clases" },
            { id: "recetas", icon: UtensilsCrossed, label: "Recetas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Notifications Panel */}
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  )
}

function HomeContent({
  userName,
  setActiveTab,
}: {
  userName: string
  setActiveTab: (tab: TabType) => void
}) {
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"]
  const [editStreak, setEditStreak] = useState(false)
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2])

  const toggleDay = (index: number) => {
    setActiveDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index],
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground">
        <p className="text-primary-foreground/80 text-sm">Bienvenido/a de vuelta</p>
        <h1 className="text-2xl font-bold mt-1">{userName}</h1>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            <span className="font-semibold">12 días</span>
            <span className="text-primary-foreground/80 text-sm">de racha</span>
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Tu Racha Semanal
          </h2>
          <button
            onClick={() => setEditStreak((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              editStreak ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {editStreak ? (
              <>
                <Check className="w-4 h-4" /> Listo
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" /> Editar
              </>
            )}
          </button>
        </div>
        <div className="flex justify-between gap-2">
          {weekDays.map((day, index) => {
            const isActive = activeDays.includes(index)
            const dayButton = (
              <div
                className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                } ${editStreak ? "cursor-pointer ring-2 ring-transparent hover:ring-primary/40" : ""}`}
              >
                {day}
              </div>
            )
            return editStreak ? (
              <button key={day} onClick={() => toggleDay(index)} className="flex-1">
                {dayButton}
              </button>
            ) : (
              <div key={day} className="flex-1">
                {dayButton}
              </div>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-3 text-center">
          {editStreak
            ? "Tocá los días para marcar tu asistencia"
            : `Llevás ${activeDays.length} días esta semana. ¡Seguí así!`}
        </p>
      </div>

      {/* Membership Status */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Estado de Membresía</p>
            <p className="font-semibold text-foreground mt-1">Plan Mensual</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Activa</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Vence en 18 días</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-gradient-to-r from-primary to-primary/80 rounded-full" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab("rutinas")}
          className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Mi Rutina</p>
          <p className="text-sm text-muted-foreground mt-1">Ver ejercicios de hoy</p>
        </button>
        <button
          onClick={() => setActiveTab("clases")}
          className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Clases</p>
          <p className="text-sm text-muted-foreground mt-1">3 clases esta semana</p>
        </button>
      </div>

      {/* Today's Routine Preview */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Rutina de Hoy - Pecho y Tríceps</h2>
          <button
            onClick={() => setActiveTab("rutinas")}
            className="text-primary text-sm font-medium flex items-center gap-1"
          >
            Ver todo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-border">
          {[
            { name: "Press de Banca", sets: "4x12" },
            { name: "Press Inclinado", sets: "3x10" },
            { name: "Aperturas", sets: "3x15" },
          ].map((exercise) => (
            <div key={exercise.name} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">{exercise.sets}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Class */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Próxima Clase</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-primary">15</span>
            <span className="text-xs text-primary">MAR</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Spinning Intensivo</p>
            <p className="text-sm text-muted-foreground">10:00 - 11:00 • Sala B</p>
            <p className="text-sm text-muted-foreground">Prof. Carlos López</p>
          </div>
          <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">
            Inscripto
          </div>
        </div>
      </div>
    </div>
  )
}
