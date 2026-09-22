import { useEffect, useState } from "react"
import {
  Home,
  Users,
  CreditCard,
  ClipboardCheck,
  Bell,
  Search,
  Plus,
  ChevronRight,
  FileCheck,
  Phone,
  Mail,
  X,
  Check,
  AlertTriangle,
  Clock,
  DollarSign,
  Upload,
  Wifi,
  Edit,
  Trash2,
  Receipt,
  Minus,
  Settings,
} from "lucide-react"
import { NotificationsPanel } from "@/components/shared/notifications-panel"
import { ChangePasswordCard } from "@/components/shared/change-password-card"
import { clientsService, type ClientApiRecord } from "@/services/clients.service"
import { attendanceService } from "@/services/attendance.service"

interface ReceptionistDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "clientes" | "pagos" | "asistencia" | "configuracion" | "perfil"

type ClientStatus = "active" | "pending_payment" | "inactive"

type ClientRecord = {
  id: number
  name: string
  email: string
  phone: string
  plan: string
  status: ClientStatus
  cuota: "Activa" | "Vencida" | "Pendiente"
  cuotaExpires: string
  aptoFisico: "Activo" | "Pendiente" | "Vencido"
  aptoExpires: string
}

const initialClients: ClientRecord[] = []

const mapClient = (client: ClientApiRecord): ClientRecord => {
  const latestQuota = client.cuotas[0]
  const clientStatus = client.estadoCliente.nombre === "HABILITADO" ? "active" : client.estadoCliente.nombre === "INHABILITADO_PAGO" ? "pending_payment" : "inactive"
  const quotaStatus = latestQuota?.estadoCuota.nombre === "ACTIVA" ? "Activa" : latestQuota?.estadoCuota.nombre === "VENCIDA" ? "Vencida" : "Pendiente"
  const clearanceActive = client.aptoFisicoFechaVencimiento && new Date(client.aptoFisicoFechaVencimiento) >= new Date()
  return {
    id: client.id,
    name: `${client.usuario.nombre} ${client.usuario.apellido}`.trim(),
    email: client.usuario.email,
    phone: client.usuario.telefono ?? "",
    plan: latestQuota?.plan.nombre ?? "Sin plan",
    status: clientStatus,
    cuota: quotaStatus,
    cuotaExpires: latestQuota?.fechaVencimiento ? new Date(latestQuota.fechaVencimiento).toLocaleDateString("es-AR") : "-",
    aptoFisico: clearanceActive ? "Activo" : client.aptoFisicoArchivo ? "Vencido" : "Pendiente",
    aptoExpires: client.aptoFisicoFechaVencimiento ? new Date(client.aptoFisicoFechaVencimiento).toLocaleDateString("es-AR") : "-",
  }
}

const storeProducts = [
  { id: 1, name: "Whey Protein Gold", category: "Proteínas", price: 45000, stock: 15 },
  { id: 2, name: "Remera Deportiva FitLogic", category: "Ropa", price: 12000, stock: 25 },
  { id: 3, name: "Creatina Monohidratada", category: "Suplementos", price: 18000, stock: 30 },
  { id: 4, name: "Guantes de Entrenamiento", category: "Accesorios", price: 8500, stock: 20 },
  { id: 5, name: "Pre-Workout Explosive", category: "Suplementos", price: 22000, stock: 12 },
  { id: 6, name: "Botella Térmica 750ml", category: "Accesorios", price: 6500, stock: 18 },
]

const initialPayments = [
  { id: 1, client: "María García", amount: 15000, date: "10/03/2026", method: "Efectivo" },
  { id: 2, client: "Laura Sánchez", amount: 15000, date: "10/03/2026", method: "MercadoPago" },
  { id: 3, client: "Pedro Gómez", amount: 40000, date: "09/03/2026", method: "Transferencia" },
]

const todayAttendance: { id: number; name: string; time: string }[] = []

const getFormattedHour = () =>
  new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })

export function ReceptionistDashboard({ userName, onLogout }: ReceptionistDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [showClientDetail, setShowClientDetail] = useState<ClientRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [clientList, setClientList] = useState<ClientRecord[]>(initialClients)
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    plan: "Mensual",
  })

  useEffect(() => {
    clientsService.list().then((clients) => setClientList(clients.map(mapClient))).catch(() => undefined)
  }, [])

  useEffect(() => {
    attendanceService.list().then((items) => setAttendanceList(items.map((item) => ({
      id: item.id,
      name: `${item.cliente.usuario.nombre} ${item.cliente.usuario.apellido}`.trim(),
      time: new Date(item.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    })))).catch(() => undefined)
  }, [])

  // Stock de productos editable y registro de ventas
  const [productList, setProductList] = useState(storeProducts)
  const [sales, setSales] = useState<
    { id: string; client: string; product: string; quantity: number; amount: number; time: string }[]
  >([
    { id: "VTA-8F2K1A", client: "María García", product: "Whey Protein Gold", quantity: 1, amount: 45000, time: "10:24" },
    { id: "VTA-3J9P7Z", client: "Mostrador (efectivo)", product: "Botella Térmica 750ml", quantity: 2, amount: 13000, time: "11:05" },
  ])
  const [paymentList, setPaymentList] = useState(initialPayments)
  const [paymentForm, setPaymentForm] = useState({
    client: "",
    amount: "",
    method: "Efectivo",
  })
  const [attendanceList, setAttendanceList] = useState(todayAttendance)
  const [attendanceForm, setAttendanceForm] = useState({ client: "" })
  const [scanStatus, setScanStatus] = useState("Esperando ingreso por QR del gimnasio...")
  const [isScanning, setIsScanning] = useState(false)
  const [editStockProduct, setEditStockProduct] = useState<(typeof storeProducts)[0] | null>(null)
  const [stockValue, setStockValue] = useState(0)
  // Buscador de productos en la sección de ventas
  const [productSearch, setProductSearch] = useState("")

  const filteredProducts = productList.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  )

  const genSaleId = () => "VTA-" + Math.random().toString(36).slice(2, 8).toUpperCase()

  // Al vender: descuenta 1 del stock y suma una venta al registro
  const handleSell = (productId: number) => {
    const product = productList.find((p) => p.id === productId)
    if (!product || product.stock <= 0) return
    setProductList((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: p.stock - 1 } : p)),
    )
    setSales((prev) => [
      {
        id: genSaleId(),
        client: "Mostrador (efectivo)",
        product: product.name,
        quantity: 1,
        amount: product.price,
        time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      },
      ...prev,
    ])
  }

  const saveStock = () => {
    if (!editStockProduct) return
    setProductList((prev) =>
      prev.map((p) => (p.id === editStockProduct.id ? { ...p, stock: Math.max(0, stockValue) } : p)),
    )
    setEditStockProduct(null)
  }

  const handleRegisterPayment = () => {
    const clientName = paymentForm.client.trim()
    const amount = Number(paymentForm.amount)

    if (!clientName || !Number.isFinite(amount) || amount <= 0) {
      return
    }

    const newPayment = {
      id: Date.now(),
      client: clientName,
      amount,
      date: new Date().toLocaleDateString("es-AR"),
      method: paymentForm.method,
    }

    setPaymentList((prev) => [newPayment, ...prev])

    setClientList((prev) =>
      prev.map((client) =>
        client.name.toLowerCase() === clientName.toLowerCase()
          ? {
              ...client,
              cuota: "Activa",
              status: "active",
              cuotaExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR"),
            }
          : client,
      ),
    )

    setPaymentForm({ client: "", amount: "", method: "Efectivo" })
  }

  const getAccessEligibility = (client: ClientRecord) => {
    if (client.status === "inactive") {
      return { allowed: false, reason: "Cliente inactivo en el sistema" }
    }

    if (client.cuota !== "Activa") {
      return { allowed: false, reason: "Cuota pendiente o vencida" }
    }

    if (client.aptoFisico !== "Activo") {
      return { allowed: false, reason: "Apto físico pendiente o vencido" }
    }

    return { allowed: true, reason: "Acceso autorizado" }
  }

  const handleRegisterAttendance = async (manualClient?: string) => {
    const clientName = (manualClient ?? attendanceForm.client).trim()

    if (!clientName) {
      return
    }

    const matchedClient = clientList.find(
      (client) => client.name.toLowerCase() === clientName.toLowerCase(),
    )

    if (!matchedClient) {
      setScanStatus(`Cliente no encontrado: ${clientName}`)
      return
    }

    const { allowed, reason } = getAccessEligibility(matchedClient)
    if (!allowed) {
      setScanStatus(`Acceso denegado para ${matchedClient.name}: ${reason}`)
      return
    }

    try {
      const attendance = await attendanceService.register(matchedClient.id)
      setAttendanceList((prev) => [{
        id: attendance.id,
        name: matchedClient.name,
        time: new Date(attendance.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      }, ...prev])
    } catch (error) {
      setScanStatus(error instanceof Error ? error.message : "No se pudo registrar la asistencia")
      return
    }

    setAttendanceForm({ client: "" })
    setScanStatus(`Ingreso registrado: ${clientName}`)
  }

  const handleScanQrEntry = () => {
    const eligibleClients = clientList.filter((client) => getAccessEligibility(client).allowed)

    if (eligibleClients.length === 0) {
      setScanStatus("No hay clientes habilitados para entrar al gimnasio")
      return
    }

    setIsScanning(true)
    setScanStatus("Escaneando QR del gimnasio...")

    window.setTimeout(() => {
      const selectedClient = eligibleClients[Math.floor(Math.random() * eligibleClients.length)]
      handleRegisterAttendance(selectedClient.name)
      setIsScanning(false)
      setScanStatus(`QR validado: ${selectedClient.name} ingresó automáticamente`)
    }, 700)
  }

  const handleRegisterMedicalClearance = (clientName: string) => {
    const normalizedName = clientName.trim()

    if (!normalizedName) {
      return
    }

    setClientList((prev) =>
      prev.map((client) =>
        client.name.toLowerCase() === normalizedName.toLowerCase()
          ? {
              ...client,
              aptoFisico: "Activo",
              aptoExpires: new Date(Date.now() + 182 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR"),
            }
          : client,
      ),
    )

    if (showClientDetail) {
      setShowClientDetail((prev) =>
        prev
          ? {
              ...prev,
              aptoFisico: "Activo",
              aptoExpires: new Date(Date.now() + 182 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR"),
            }
          : null,
      )
    }
  }

  const deleteProduct = (productId: number) => {
    setProductList((prev) => prev.filter((p) => p.id !== productId))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const filteredClients = clientList.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || client.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleCreateClient = async () => {
    const name = newClientForm.name.trim()
    const email = newClientForm.email.trim()
    const phone = newClientForm.phone.trim()
    const password = newClientForm.password.trim()

    if (!name || !email || !phone || password.length < 6) {
      return
    }

    const [nombre, ...apellidoParts] = name.split(/\s+/)
    const created = await clientsService.create({
      nombre,
      apellido: apellidoParts.join(" ") || nombre,
      email,
      password,
      telefono: phone,
    })
    setClientList((prev) => [mapClient(created), ...prev])
    setNewClientForm({ name: "", email: "", phone: "", password: "", plan: "Mensual" })
    setShowNewClient(false)
    setActiveTab("clientes")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">Activo</span>
      case "pending_payment":
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded-full font-medium">Pago Pendiente</span>
      case "inactive":
        return <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded-full font-medium">Inactivo</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pl-64">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-sidebar-foreground">FitLogic</span>
              <p className="text-xs text-sidebar-foreground/60">Recepción</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "home", icon: Home, label: "Inicio" },
            { id: "clientes", icon: Users, label: "Clientes" },
            { id: "pagos", icon: CreditCard, label: "Pagos" },
            { id: "asistencia", icon: ClipboardCheck, label: "Asistencia" },
            { id: "configuracion", icon: Settings, label: "Configuración" },
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
              <p className="text-xs text-sidebar-foreground/60">Recepcionista</p>
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

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">FitLogic</span>
              <span className="text-xs text-primary ml-2 font-medium">Recepción</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                4
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6">
        {activeTab === "home" && (
          <div className="space-y-6 max-w-6xl">
            {/* Welcome */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground">
              <p className="text-primary-foreground/80 text-sm">Bienvenida</p>
              <h1 className="text-2xl font-bold mt-1">{userName}</h1>
              <p className="text-primary-foreground/80 mt-2">Panel de Recepción</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                <p className="text-xs text-muted-foreground mt-1">Cuota al día</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">8</p>
                <p className="text-sm text-muted-foreground">Clientes Inactivos</p>
                <p className="text-xs text-muted-foreground mt-1">+2 meses sin pagar</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">42</p>
                <p className="text-sm text-muted-foreground">Asistencias Hoy</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowNewClient(true)}
                className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3 hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-6 h-6" />
                <span className="font-semibold">Nuevo Cliente</span>
              </button>
              <button
                onClick={() => setActiveTab("asistencia")}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary/50 transition-colors"
              >
                <ClipboardCheck className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">Ver Asistencias</span>
              </button>
            </div>

            {/* Today's Attendance */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Asistencias de Hoy</h2>
                <button
                  onClick={() => setActiveTab("asistencia")}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  Ver todas <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {attendanceList.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-foreground font-medium">
                        {entry.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{entry.name}</span>
                    </div>
                    <span className="text-muted-foreground">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Pagos Recientes</h2>
                <button
                  onClick={() => setActiveTab("pagos")}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {paymentList.slice(0, 4).map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{payment.client}</p>
                      <p className="text-sm text-muted-foreground">{payment.date} • {payment.method}</p>
                    </div>
                    <span className="font-semibold text-green-500">{formatPrice(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
                <p className="text-muted-foreground mt-1">Gestiona los clientes del gimnasio</p>
              </div>
              <button
                onClick={() => setShowNewClient(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nuevo Cliente
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="pending_payment">Pago Pendiente</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            {/* Clients List */}
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setShowClientDetail(client)}
                  className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-foreground font-semibold">
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{client.name}</h3>
                          {getStatusBadge(client.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Plan: <span className="text-foreground font-medium">{client.plan}</span>
                    </span>
                    <span className={`text-sm ${client.cuota === "Activa" ? "text-green-500" : client.cuota === "Vencida" ? "text-red-500" : "text-yellow-500"}`}>
                      Cuota: {client.cuota}
                    </span>
                    <span className={`text-sm ${client.aptoFisico === "Activo" ? "text-green-500" : client.aptoFisico === "Vencido" ? "text-red-500" : "text-yellow-500"}`}>
                      Apto: {client.aptoFisico}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "pagos" && (
          <div className="space-y-6 max-w-6xl">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
              <p className="text-muted-foreground mt-1">Gestiona los pagos de los clientes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Ingresos del Día</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatPrice(70000)}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                <p className="text-2xl font-bold text-yellow-500 mt-1">12</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 col-span-2 lg:col-span-1">
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
                <p className="text-2xl font-bold text-green-500 mt-1">{formatPrice(1250000)}</p>
              </div>
            </div>

            {/* Register Payment */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-4">Registrar Pago</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={paymentForm.client}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, client: e.target.value }))}
                    placeholder="Nombre del cliente"
                    className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Monto"
                  className="px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                  className="px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="MercadoPago">MercadoPago</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <button
                onClick={handleRegisterPayment}
                className="mt-4 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                Registrar Pago
              </button>
            </div>

            {/* Recent Payments */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Historial de Pagos</h2>
              </div>
              <div className="divide-y divide-border">
                {paymentList.map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{payment.client}</p>
                        <p className="text-sm text-muted-foreground">{payment.date} • {payment.method}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">{formatPrice(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "asistencia" && (
          <div className="space-y-6 max-w-6xl">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Asistencia</h1>
              <p className="text-muted-foreground mt-1">Sincronizada automáticamente con el sistema de entrada</p>
            </div>

            {/* Automatic Sync Notice */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">Registro Automático Activo</h2>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Las asistencias se registran automáticamente cuando el cliente ingresa por el
                    sistema de entrada del gimnasio (molinete / lector). No es necesario cargarlas a mano.
                  </p>
                </div>
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Asistencias de Hoy ({attendanceList.length})</h2>
                <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString("es-AR")}</span>
              </div>

              <div className="p-4 border-b border-border space-y-4">
                <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Entrada automática del gimnasio</p>
                      <p className="font-semibold text-foreground">Escáner QR en acceso</p>
                    </div>
                    <button
                      onClick={handleScanQrEntry}
                      disabled={isScanning}
                      className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isScanning ? "Escaneando..." : "Escanear QR"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-primary font-medium">{scanStatus}</p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={attendanceForm.client}
                    onChange={(e) => setAttendanceForm({ client: e.target.value })}
                    placeholder="Ingreso manual (respaldo)"
                    className="flex-1 px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => handleRegisterAttendance()}
                    className="px-4 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Manual
                  </button>
                </div>
              </div>

              <div className="divide-y divide-border">
                {attendanceList.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{entry.name}</span>
                        <p className="text-xs text-muted-foreground">Ingreso automático por acceso</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tienda" && (
          <div className="space-y-6 max-w-6xl">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tienda</h1>
              <p className="text-muted-foreground mt-1">Vende productos en efectivo y gestiona el stock</p>
            </div>

            {/* Store Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Ventas del Día</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatPrice(sales.reduce((sum, s) => sum + s.amount, 0))}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {sales.reduce((sum, s) => sum + s.quantity, 0)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 col-span-2 lg:col-span-1">
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-500 mt-1">
                  {productList.filter((p) => p.stock < 15).length} productos
                </p>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border space-y-3">
                <div>
                  <h2 className="font-semibold text-foreground">Catálogo de Productos</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Al vender se descuenta 1 del stock y se agrega la venta al registro.
                  </p>
                </div>
                {/* Buscador de productos por nombre */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre..."
                    className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Producto</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Categoría</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Precio</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stock</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                          No se encontraron productos con ese nombre.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{product.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{product.category}</td>
                        <td className="p-4 font-medium text-foreground">{formatPrice(product.price)}</td>
                        <td className="p-4">
                          <span className={`font-medium ${product.stock === 0 ? "text-red-500" : product.stock < 15 ? "text-yellow-500" : "text-green-500"}`}>
                            {product.stock} u.
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSell(product.id)}
                              disabled={product.stock <= 0}
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Vender
                            </button>
                            <button
                              onClick={() => {
                                setEditStockProduct(product)
                                setStockValue(product.stock)
                              }}
                              aria-label={`Editar stock de ${product.name}`}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              aria-label={`Eliminar ${product.name}`}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Registry */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Registro de Ventas</h2>
              </div>
              {sales.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Todavía no se registraron ventas hoy.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID Compra</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Comprador</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Producto</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cant.</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Monto</th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-4">
                            <span className="font-mono text-xs px-2 py-1 bg-secondary text-foreground rounded-lg">
                              {sale.id}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-foreground">{sale.client}</td>
                          <td className="p-4 text-muted-foreground">{sale.product}</td>
                          <td className="p-4 text-foreground">{sale.quantity}</td>
                          <td className="p-4 font-medium text-green-500">{formatPrice(sale.amount)}</td>
                          <td className="p-4 text-right text-muted-foreground">{sale.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "configuracion" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
              <p className="text-muted-foreground mt-1">Gestioná tus datos y tu contraseña</p>
            </div>

            {/* Datos básicos */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {userName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{userName}</h2>
                  <p className="text-muted-foreground">Recepcionista</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nombre Completo</label>
                  <input
                    type="text"
                    defaultValue={userName}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    defaultValue="recepcion@fitlogic.com"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Teléfono / Contacto</label>
                  <input
                    type="tel"
                    defaultValue="+54 11 1234-5678"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </div>

            {/* Cambio de contraseña temporal */}
            <ChangePasswordCard />

            <button
              onClick={onLogout}
              className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-2">
          {[
            { id: "home", icon: Home, label: "Inicio" },
            { id: "clientes", icon: Users, label: "Clientes" },
            { id: "pagos", icon: CreditCard, label: "Pagos" },
            { id: "asistencia", icon: ClipboardCheck, label: "Asist." },
            { id: "configuracion", icon: Settings, label: "Config" },
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

      {/* Modals */}
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* New Client Modal */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Nuevo Cliente</h2>
              <button
                onClick={() => setShowNewClient(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre Completo</label>
                <input
                  type="text"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="juan@email.com"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teléfono</label>
                <input
                  type="tel"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+54 11 1234-5678"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Contraseña inicial</label>
                <input
                  type="password"
                  value={newClientForm.password}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={handleCreateClient}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Registrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {showClientDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Detalle del Cliente</h2>
              <button
                onClick={() => setShowClientDetail(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-foreground text-xl font-semibold">
                  {showClientDetail.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{showClientDetail.name}</h3>
                  {getStatusBadge(showClientDetail.status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{showClientDetail.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{showClientDetail.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium text-foreground">{showClientDetail.plan}</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Cuota</p>
                  <p className={`font-medium ${showClientDetail.cuota === "Activa" ? "text-green-500" : "text-red-500"}`}>
                    {showClientDetail.cuota}
                  </p>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Vence Cuota</p>
                  <p className="font-medium text-foreground">{showClientDetail.cuotaExpires}</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Apto Físico</p>
                  <p className={`font-medium ${showClientDetail.aptoFisico === "Activo" ? "text-green-500" : showClientDetail.aptoFisico === "Pendiente" ? "text-yellow-500" : "text-red-500"}`}>
                    {showClientDetail.aptoFisico}
                  </p>
                </div>
              </div>

              {/* Apto Físico Upload */}
              <div className="p-4 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showClientDetail.aptoFisico === "Activo" ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                      <FileCheck className={`w-5 h-5 ${showClientDetail.aptoFisico === "Activo" ? "text-green-500" : "text-yellow-500"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Apto Físico</p>
                      {showClientDetail.aptoFisico === "Activo" ? (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">Activo</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full font-medium">Pendiente</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRegisterMedicalClearance(showClientDetail.name)}
                  className="w-full py-2.5 bg-secondary text-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {showClientDetail.aptoFisico === "Activo" ? "Actualizar Apto Físico" : "Cargar Apto Físico"}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  El cliente entrega el apto físico en recepción y se carga desde aquí.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPaymentForm({
                      client: showClientDetail.name,
                      amount: "15000",
                      method: "Efectivo",
                    })
                    setActiveTab("pagos")
                    setShowClientDetail(null)
                  }}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Registrar Pago
                </button>
                <button className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors">
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {editStockProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Editar Stock</h2>
              <button
                onClick={() => setEditStockProduct(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{editStockProduct.name}</p>
                  <p className="text-sm text-muted-foreground">{editStockProduct.category}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unidades en stock</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStockValue((v) => Math.max(0, v - 1))}
                    aria-label="Restar una unidad"
                    className="w-11 h-11 flex items-center justify-center bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={stockValue}
                    onChange={(e) => setStockValue(Math.max(0, Number(e.target.value)))}
                    className="flex-1 text-center px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  />
                  <button
                    onClick={() => setStockValue((v) => v + 1)}
                    aria-label="Sumar una unidad"
                    className="w-11 h-11 flex items-center justify-center bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <button
                onClick={saveStock}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Guardar Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
