import { useState } from "react"
import {
  User,
  Mail,
  Phone,
  CreditCard,
  FileCheck,
  History,
  LogOut,
  ChevronRight,
  Calendar,
  Bell,
  Settings,
} from "lucide-react"
import { ChangePasswordCard } from "@/components/shared/change-password-card"

interface ClientProfileProps {
  userName: string
  onLogout: () => void
}

const paymentHistory = [
  { id: 1, date: "01/03/2026", amount: 15000, period: "Marzo 2026", status: "Pagado" },
  { id: 2, date: "01/02/2026", amount: 15000, period: "Febrero 2026", status: "Pagado" },
  { id: 3, date: "01/01/2026", amount: 15000, period: "Enero 2026", status: "Pagado" },
  { id: 4, date: "01/12/2025", amount: 12000, period: "Diciembre 2025", status: "Pagado" },
]

const attendanceHistory = [
  { date: "10/03/2026", time: "08:15" },
  { date: "08/03/2026", time: "09:30" },
  { date: "06/03/2026", time: "07:45" },
  { date: "05/03/2026", time: "18:20" },
  { date: "03/03/2026", time: "08:00" },
]

export function ClientProfile({ userName, onLogout }: ClientProfileProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {userName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{userName}</h1>
            <p className="text-muted-foreground">Cliente desde Enero 2025</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-500 font-medium">Membresía Activa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Información Personal</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground">maria.garcia@email.com</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="text-foreground">+54 11 1234-5678</p>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Status */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Plan Mensual</h2>
            <p className="text-sm text-muted-foreground">Vence el 28/03/2026</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-foreground">{formatPrice(15000)}</p>
            <p className="text-sm text-muted-foreground">/mes</p>
          </div>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
          <div className="h-full w-3/5 bg-primary rounded-full" />
        </div>
        <p className="text-sm text-muted-foreground">18 días restantes</p>
        <button className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Renovar Membresía
        </button>
      </div>

      {/* Apto Físico */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Apto Físico</h2>
            <p className="text-sm text-green-500">Activo · Vence 15/12/2026</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Para actualizar tu apto físico, entregalo en recepción. El recepcionista lo carga en el sistema.
        </p>
      </div>

      {/* Menu Options */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setActiveSection(activeSection === "payments" ? null : "payments")}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-foreground">Historial de Pagos</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === "payments" ? "rotate-90" : ""}`} />
        </button>
        
        {activeSection === "payments" && (
          <div className="border-t border-border p-4 space-y-3 bg-secondary/30">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-card rounded-xl">
                <div>
                  <p className="font-medium text-foreground">{payment.period}</p>
                  <p className="text-sm text-muted-foreground">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{formatPrice(payment.amount)}</p>
                  <p className="text-sm text-green-500">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setActiveSection(activeSection === "attendance" ? null : "attendance")}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors border-t border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-foreground">Historial de Asistencia</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === "attendance" ? "rotate-90" : ""}`} />
        </button>

        {activeSection === "attendance" && (
          <div className="border-t border-border p-4 space-y-2 bg-secondary/30">
            {attendanceHistory.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-card rounded-xl">
                <span className="text-foreground">{entry.date}</span>
                <span className="text-muted-foreground">{entry.time}</span>
              </div>
            ))}
          </div>
        )}

        <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors border-t border-border">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-foreground">Notificaciones</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button
          onClick={() => setActiveSection(activeSection === "config" ? null : "config")}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors border-t border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-foreground">Configuración</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === "config" ? "rotate-90" : ""}`} />
        </button>

        {activeSection === "config" && (
          <div className="border-t border-border p-4 bg-secondary/30">
            <ChangePasswordCard />
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Cerrar Sesión
      </button>

      {/* Delete Account */}
      <button className="w-full text-center text-sm text-muted-foreground hover:text-red-500 transition-colors">
        Eliminar mi cuenta
      </button>
    </div>
  )
}
