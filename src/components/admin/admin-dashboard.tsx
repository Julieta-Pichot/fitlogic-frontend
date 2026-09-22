import { useEffect, useMemo, useState } from "react"
import {
  Home,
  Users,
  CreditCard,
  Bell,
  Plus,
  Shield,
  Calendar,
  Trash2,
  X,
  DollarSign,
  HelpCircle,
  Phone,
  Mail,
  Clock,
} from "lucide-react"
import toast from "react-hot-toast"
import { NotificationsPanel } from "@/components/shared/notifications-panel"
import { UsersManagement } from "@/features/admin/users/users-management"
import { configService, dashboardService, plansService, type DashboardStats } from "@/services/api"

interface AdminDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "usuarios" | "planes" | "soporte"
type RevenueRange = 6 | 12

type PlanRecord = {
  id: number
  nombre: string
  duracionDias: number
  precio: number | string
  activo: number
}

const emptyStats: DashboardStats = {
  clientesActivos: 0,
  ingresosDelMes: 0,
  planesActivos: 0,
  clasesEstaSemana: 0,
  ingresosMensuales: [],
}

export function AdminDashboard({ userName, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)

  const [planList, setPlanList] = useState<PlanRecord[]>([])
  const [newPlanForm, setNewPlanForm] = useState({ name: "", duration: "", price: "" })
  const [supportForm, setSupportForm] = useState({ telefono: "", emailSoporte: "" })
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [revenueRange, setRevenueRange] = useState<RevenueRange>(6)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plans = await plansService.list()
        setPlanList(
          plans.map((plan) => ({
            id: plan.id,
            nombre: plan.nombre,
            duracionDias: Number(plan.duracionDias),
            precio: Number(plan.precio ?? 0),
            activo: Number(plan.activo ?? 1),
          }))
        )
      } catch {
        toast.error("No se pudo cargar el catálogo del gimnasio")
      }
    }

    loadPlans()
  }, [])

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const data = await dashboardService.getStats(revenueRange)
        setStats(data ?? emptyStats)
      } catch {
        toast.error("No se pudieron cargar las estadísticas del dashboard")
      } finally {
        setStatsLoading(false)
      }
    }

    if (activeTab === "home") {
      loadStats()
    }
  }, [activeTab, revenueRange])

  useEffect(() => {
    const loadSupport = async () => {
      try {
        const response = await configService.getSystem()
        const gym = response.data?.gimnasio
        setSupportForm({
          telefono: gym?.telefono ?? "",
          emailSoporte: gym?.emailSoporte ?? "",
        })
      } catch {
        toast.error("No se pudieron cargar los datos de soporte")
      }
    }

    if (activeTab === "soporte") {
      loadSupport()
    }
  }, [activeTab])

  const createPlan = async () => {
    const name = newPlanForm.name.trim()
    const duration = Number(newPlanForm.duration)
    const price = Number(newPlanForm.price)

    if (!name || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(price) || price <= 0) {
      return
    }

    try {
      const response = await plansService.create({ nombre: name, duracionDias: duration, precio: price })

      const plan = response.data as PlanRecord
      setPlanList((prev) => [{
        id: plan.id,
        nombre: plan.nombre,
        duracionDias: Number(plan.duracionDias),
        precio: Number(plan.precio ?? 0),
        activo: Number(plan.activo ?? 1),
      }, ...prev])

      setNewPlanForm({ name: "", duration: "", price: "" })
      setShowCreatePlan(false)
      toast.success("Plan creado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el plan")
    }
  }

  const saveSupportConfig = async () => {
    try {
      await configService.updateGym({
        telefono: supportForm.telefono.trim(),
        emailSoporte: supportForm.emailSoporte.trim(),
      })
      toast.success("Datos de soporte guardados correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar los datos de soporte")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const maxMonthlyRevenue = useMemo(
    () => Math.max(0, ...stats.ingresosMensuales.map((item) => item.total)),
    [stats.ingresosMensuales]
  )

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex-col hidden lg:flex">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-sidebar-foreground">FitLogic</span>
              <p className="text-xs text-sidebar-foreground/60">Panel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "home", icon: Home, label: "Dashboard" },
            { id: "usuarios", icon: Users, label: "Usuarios" },
            { id: "planes", icon: CreditCard, label: "Planes" },
            { id: "soporte", icon: HelpCircle, label: "Soporte" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrador</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2 text-red-500 text-sm font-medium hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">FitLogic</span>
              <span className="text-xs text-primary ml-2 font-medium">Admin</span>
            </div>
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              5
            </span>
          </button>
        </div>
      </header>

      <main className="lg:ml-64 p-4 lg:p-6 pb-24 lg:pb-6">
        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
              <p className="text-primary-foreground/80">Panel de Administración</p>
              <h1 className="text-2xl font-bold mt-1">Bienvenido, {userName}</h1>
              <p className="text-primary-foreground/80 mt-2">Gestiona todo tu gimnasio desde aquí</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{statsLoading ? "—" : stats.clientesActivos}</p>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? "—" : formatPrice(stats.ingresosDelMes)}
                </p>
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{statsLoading ? "—" : stats.planesActivos}</p>
                <p className="text-sm text-muted-foreground">Planes Activos</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{statsLoading ? "—" : stats.clasesEstaSemana}</p>
                <p className="text-sm text-muted-foreground">Clases Esta Semana</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-foreground">Ingresos Mensuales</h2>
                <select
                  value={revenueRange}
                  onChange={(event) => setRevenueRange(Number(event.target.value) as RevenueRange)}
                  className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground"
                >
                  <option value={6}>Últimos 6 meses</option>
                  <option value={12}>Último año</option>
                </select>
              </div>
              <div className="h-48 flex items-end justify-between gap-2">
                {stats.ingresosMensuales.length === 0 ? (
                  <p className="w-full text-center text-sm text-muted-foreground self-center">
                    {statsLoading ? "Cargando ingresos..." : "No hay pagos en el período seleccionado"}
                  </p>
                ) : (
                  stats.ingresosMensuales.map((item) => {
                    const height = maxMonthlyRevenue > 0 ? (item.total / maxMonthlyRevenue) * 100 : 0
                    return (
                      <div key={`${item.year}-${item.month}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[10px] text-muted-foreground">
                          {item.total > 0 ? formatPrice(item.total) : ""}
                        </span>
                        <div
                          className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary min-h-[4px]"
                          style={{ height: `${Math.max(height, item.total > 0 ? 8 : 4)}%` }}
                          title={formatPrice(item.total)}
                        />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "usuarios" && <UsersManagement />}

        {activeTab === "planes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Planes</h1>
                <p className="text-muted-foreground mt-1">Configura los planes de membresía</p>
              </div>
              <button
                onClick={() => setShowCreatePlan(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nuevo Plan
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planList.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-card border rounded-2xl p-5 ${
                    Number(plan.activo) === 1 ? "border-primary/50" : "border-border opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{plan.nombre}</h3>
                      <p className="text-sm text-muted-foreground">{Number(plan.duracionDias)} días</p>
                    </div>
                    {Number(plan.activo) === 1 ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-secondary text-muted-foreground text-xs rounded-full font-medium">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-foreground">{formatPrice(Number(plan.precio ?? 0))}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={async () => {
                        try {
                          const nextState = Number(plan.activo) === 1 ? 0 : 1
                          await plansService.toggleActive(plan.id, nextState)
                          setPlanList((prev) => prev.map((item) => item.id === plan.id ? { ...item, activo: nextState } : item))
                          toast.success("Estado del plan actualizado")
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado del plan")
                        }
                      }}
                      className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      {Number(plan.activo) === 1 ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await plansService.remove(plan.id)
                          setPlanList((prev) => prev.filter((item) => item.id !== plan.id))
                          toast.success("Plan eliminado")
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "No se pudo eliminar el plan")
                        }
                      }}
                      className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "soporte" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Soporte</h1>
              <p className="text-muted-foreground mt-1">Datos de contacto de soporte del gimnasio</p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Contacto de Soporte</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={supportForm.telefono}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+54 9 11 0000-0000"
                      className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={supportForm.emailSoporte}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, emailSoporte: e.target.value }))}
                      placeholder="soporte@gimnasio.com"
                      className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>
                </div>
                <button onClick={saveSupportConfig} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Horario de Atención</h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horario de Atención</p>
                    <p className="font-medium text-foreground">Lun a Vie · 9:00 a 18:00 hs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {[
            { id: "home", icon: Home, label: "Inicio" },
            { id: "usuarios", icon: Users, label: "Usuarios" },
            { id: "planes", icon: CreditCard, label: "Planes" },
            { id: "soporte", icon: HelpCircle, label: "Soporte" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
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

      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {showCreatePlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Nuevo Plan</h2>
              <button
                onClick={() => setShowCreatePlan(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre del Plan</label>
                <input
                  type="text"
                  value={newPlanForm.name}
                  onChange={(e) => setNewPlanForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Plan Anual"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Duración (días)</label>
                  <input
                    type="number"
                    value={newPlanForm.duration}
                    onChange={(e) => setNewPlanForm((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="365"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Precio ($)</label>
                  <input
                    type="number"
                    value={newPlanForm.price}
                    onChange={(e) => setNewPlanForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="120000"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <button
                onClick={createPlan}
                disabled={!newPlanForm.name.trim() || !newPlanForm.duration || !newPlanForm.price}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crear Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
