import { useCallback, useEffect, useRef, useState } from "react"
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
import toast from "react-hot-toast"
import { NotificationsPanel } from "@/components/shared/notifications-panel"
import { ChangePasswordCard } from "@/components/shared/change-password-card"
import { ClientSelect } from "@/components/receptionist/client-select"
import { clientsService, type ClientApiRecord } from "@/services/clients.service"
import { attendanceService } from "@/services/attendance.service"
import {
  recepcionService,
  type ReceptionPayment,
  type ReceptionPlan,
  type ReceptionStats,
} from "@/services/recepcion.service"
import { configService } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"
import { getErrorMessage } from "@/utils/get-error-message"
import type { ApiFieldError } from "@/types"

interface ReceptionistDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "clientes" | "pagos" | "asistencia" | "configuracion" | "perfil"

type ClientStatus = "active" | "pending_payment" | "inactive"
type AptoStatus = "Vigente" | "Vencido" | "Sin cargar"

type ClientRecord = {
  id: number
  nombre: string
  apellido: string
  name: string
  email: string
  phone: string
  objetivo: string
  plan: string
  status: ClientStatus
  cuota: "Activa" | "Vencida" | "Pendiente" | "Sin cuota"
  cuotaExpires: string
  // Cuota PENDIENTE más reciente del cliente: es la que se confirma al registrar un pago.
  pendingQuota: { id: number; planName: string; price: number } | null
  aptoFisico: AptoStatus
  aptoLoadedAt: string
  aptoExpires: string
}

type PaymentMethod = { id: number; nombre: string }

const initialClients: ClientRecord[] = []

// Las columnas @db.Date llegan como "YYYY-MM-DD…T00:00:00Z". Se trabaja con el día
// calendario (sin pasar por Date) para que la zona horaria no lo corra un día.
const isoDay = (value: string) => value.slice(0, 10)

const formatDateOnly = (value?: string | null) => {
  if (!value) return "-"
  const [year, month, day] = isoDay(value).split("-")
  return `${day}/${month}/${year}`
}

const todayIsoDay = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

// El estado del apto físico no se guarda: se calcula contra la fecha de vencimiento.
const getAptoStatus = (expiresAt: string | null): AptoStatus => {
  if (!expiresAt) return "Sin cargar"
  return isoDay(expiresAt) >= todayIsoDay() ? "Vigente" : "Vencido"
}

const mapClient = (client: ClientApiRecord): ClientRecord => {
  const latestQuota = client.cuotas[0]
  const pendingQuota = client.cuotas.find((quota) => quota.estadoCuota.nombre === "PENDIENTE")
  const clientStatus = client.estadoCliente.nombre === "HABILITADO" ? "active" : client.estadoCliente.nombre === "INHABILITADO_PAGO" ? "pending_payment" : "inactive"
  const quotaStatus = !latestQuota
    ? "Sin cuota"
    : latestQuota.estadoCuota.nombre === "ACTIVA"
      ? "Activa"
      : latestQuota.estadoCuota.nombre === "VENCIDA"
        ? "Vencida"
        : "Pendiente"
  return {
    id: client.id,
    nombre: client.usuario.nombre,
    apellido: client.usuario.apellido,
    name: `${client.usuario.nombre} ${client.usuario.apellido}`.trim(),
    email: client.usuario.email,
    phone: client.usuario.telefono ?? "",
    objetivo: client.objetivoEntrenamiento ?? "",
    plan: latestQuota?.plan.nombre ?? "Sin plan",
    status: clientStatus,
    cuota: quotaStatus,
    cuotaExpires: formatDateOnly(latestQuota?.fechaVencimiento),
    pendingQuota: pendingQuota
      ? { id: pendingQuota.id, planName: pendingQuota.plan.nombre, price: Number(pendingQuota.plan.precio) }
      : null,
    aptoFisico: getAptoStatus(client.aptoFisicoFechaVencimiento),
    aptoLoadedAt: formatDateOnly(client.aptoFisicoFechaCarga),
    aptoExpires: formatDateOnly(client.aptoFisicoFechaVencimiento),
  }
}

// Errores por campo que devuelve el backend (express-validator): { path, msg }.
const fieldErrorsFromApi = (error: unknown): Record<string, string> => {
  const items = (error as { response?: { data?: { errors?: ApiFieldError[] } } })?.response?.data?.errors
  const result: Record<string, string> = {}
  items?.forEach((item) => {
    if (item.path && !result[item.path]) result[item.path] = item.msg
  })
  return result
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const APTO_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const APTO_MAX_BYTES = 5 * 1024 * 1024

// Las claves coinciden con los campos del backend para poder mapear sus errores 1 a 1.
type NewClientForm = {
  nombre: string
  apellido: string
  email: string
  telefono: string
  password: string
  objetivoEntrenamiento: string
  planId: string
}

const emptyNewClientForm: NewClientForm = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  password: "",
  objetivoEntrenamiento: "",
  planId: "",
}

const validateNewClient = (form: NewClientForm) => {
  const errors: Record<string, string> = {}
  if (!form.nombre.trim()) errors.nombre = "Ingresá el nombre del cliente"
  if (!form.apellido.trim()) errors.apellido = "Ingresá el apellido del cliente"
  if (!form.email.trim()) errors.email = "Ingresá el email"
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "El email no es válido"
  if (!form.telefono.trim()) errors.telefono = "Ingresá el teléfono"
  if (!form.password) errors.password = "Ingresá una contraseña inicial"
  else if (form.password.length < 6) errors.password = "La contraseña debe tener al menos 6 caracteres"
  if (!form.planId) errors.planId = "Seleccioná un plan"
  return errors
}

const formatMethodName = (name: string) =>
  name
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-red-500">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  ) : null

const inputClass = (hasError?: boolean) =>
  `w-full px-4 py-3 bg-secondary border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground ${
    hasError ? "border-red-500" : "border-border"
  }`

const storeProducts = [
  { id: 1, name: "Whey Protein Gold", category: "Proteínas", price: 45000, stock: 15 },
  { id: 2, name: "Remera Deportiva FitLogic", category: "Ropa", price: 12000, stock: 25 },
  { id: 3, name: "Creatina Monohidratada", category: "Suplementos", price: 18000, stock: 30 },
  { id: 4, name: "Guantes de Entrenamiento", category: "Accesorios", price: 8500, stock: 20 },
  { id: 5, name: "Pre-Workout Explosive", category: "Suplementos", price: 22000, stock: 12 },
  { id: 6, name: "Botella Térmica 750ml", category: "Accesorios", price: 6500, stock: 18 },
]

const getFormattedHour = () =>
  new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })

export function ReceptionistDashboard({ userName, onLogout }: ReceptionistDashboardProps) {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [detailClientId, setDetailClientId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [clientList, setClientList] = useState<ClientRecord[]>(initialClients)
  const showClientDetail = clientList.find((client) => client.id === detailClientId) ?? null

  // Alta de cliente
  const [newClientForm, setNewClientForm] = useState<NewClientForm>(emptyNewClientForm)
  const [newClientErrors, setNewClientErrors] = useState<Record<string, string>>({})
  const [creatingClient, setCreatingClient] = useState(false)
  const [plans, setPlans] = useState<ReceptionPlan[]>([])

  // Detalle de cliente: edición y carga de apto físico
  const [isEditingClient, setIsEditingClient] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: "", apellido: "", telefono: "", objetivoEntrenamiento: "" })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [savingClient, setSavingClient] = useState(false)
  const [uploadingApto, setUploadingApto] = useState(false)
  const aptoInputRef = useRef<HTMLInputElement>(null)

  // Datos reales de las cards y del historial de pagos
  const [stats, setStats] = useState<ReceptionStats | null>(null)
  const [paymentList, setPaymentList] = useState<ReceptionPayment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  const loadClients = useCallback(() => {
    return clientsService
      .list()
      .then((clients) => setClientList(clients.map(mapClient)))
      .catch((error) => toast.error(getErrorMessage(error, "No se pudieron cargar los clientes")))
  }, [])

  const loadStats = useCallback(() => {
    return recepcionService
      .getStats()
      .then(setStats)
      .catch(() => undefined)
  }, [])

  const loadPayments = useCallback(() => {
    return recepcionService
      .listPayments(50)
      .then(setPaymentList)
      .catch(() => undefined)
  }, [])

  const loadAttendance = useCallback(() => {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    return attendanceService
      .list({ desde: dayStart.toISOString(), hasta: dayEnd.toISOString() })
      .then((items) =>
        setAttendanceList(
          items.map((item) => ({
            id: item.id,
            name: `${item.cliente.usuario.nombre} ${item.cliente.usuario.apellido}`.trim(),
            time: new Date(item.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          })),
        ),
      )
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    loadClients()
    loadStats()
    loadPayments()
    loadAttendance()
    recepcionService.listPlans().then(setPlans).catch(() => undefined)
    // Las opciones de método de pago salen del catálogo MetodoPago, no de un array fijo.
    configService
      .getSystem()
      .then((response) => setPaymentMethods(response.data?.metodosPago ?? []))
      .catch(() => undefined)
  }, [loadClients, loadStats, loadPayments, loadAttendance])

  // Stock de productos editable y registro de ventas
  const [productList, setProductList] = useState(storeProducts)
  const [sales, setSales] = useState<
    { id: string; client: string; product: string; quantity: number; amount: number; time: string }[]
  >([
    { id: "VTA-8F2K1A", client: "María García", product: "Whey Protein Gold", quantity: 1, amount: 45000, time: "10:24" },
    { id: "VTA-3J9P7Z", client: "Mostrador (efectivo)", product: "Botella Térmica 750ml", quantity: 2, amount: 13000, time: "11:05" },
  ])

  // Registrar pago
  const [paymentForm, setPaymentForm] = useState<{ clientId: number | null; amount: string; methodId: string }>({
    clientId: null,
    amount: "",
    methodId: "",
  })
  const [paymentError, setPaymentError] = useState("")
  const [registeringPayment, setRegisteringPayment] = useState(false)
  const paymentClient = clientList.find((client) => client.id === paymentForm.clientId) ?? null
  const paymentQuota = paymentClient?.pendingQuota ?? null
  const paymentMethodId = paymentForm.methodId || (paymentMethods[0] ? String(paymentMethods[0].id) : "")

  // Asistencia
  const [attendanceList, setAttendanceList] = useState<{ id: number; name: string; time: string }[]>([])
  const [attendanceForm, setAttendanceForm] = useState<{ clientId: number | null }>({ clientId: null })
  const [attendanceMessage, setAttendanceMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [registeringAttendance, setRegisteringAttendance] = useState(false)
  const [scanStatus, setScanStatus] = useState("Esperando ingreso por QR del gimnasio...")
  const [isScanning, setIsScanning] = useState(false)

  // Configuración (datos del recepcionista logueado)
  const [profileForm, setProfileForm] = useState({
    nombre: user?.nombre ?? "",
    apellido: user?.apellido ?? "",
    email: user?.email ?? "",
    telefono: user?.telefono ?? "",
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [savingProfile, setSavingProfile] = useState(false)

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

  const selectPaymentClient = (clientId: number | null) => {
    const client = clientList.find((item) => item.id === clientId)
    setPaymentError("")
    // Al elegir cliente se autocompleta el monto con el precio del plan de su cuota pendiente.
    setPaymentForm((prev) => ({
      ...prev,
      clientId,
      amount: client?.pendingQuota ? String(client.pendingQuota.price) : "",
    }))
  }

  const handleRegisterPayment = async () => {
    const amount = Number(paymentForm.amount)

    if (!paymentClient) return setPaymentError("Seleccioná un cliente")
    if (!paymentQuota) return setPaymentError("Este cliente no tiene una cuota pendiente de pago")
    if (!paymentForm.amount || !Number.isFinite(amount) || amount <= 0) return setPaymentError("Ingresá un monto mayor a 0")
    if (!paymentMethodId) return setPaymentError("Seleccioná un método de pago")

    setPaymentError("")
    setRegisteringPayment(true)
    try {
      await recepcionService.confirmPayment(paymentQuota.id, { metodoPagoId: Number(paymentMethodId), monto: amount })
      toast.success(`Pago registrado: ${paymentClient.name}`)
      setPaymentForm({ clientId: null, amount: "", methodId: "" })
      await Promise.all([loadClients(), loadPayments(), loadStats()])
    } catch (error) {
      setPaymentError(getErrorMessage(error, "No se pudo registrar el pago"))
    } finally {
      setRegisteringPayment(false)
    }
  }

  const getAccessEligibility = (client: ClientRecord) => {
    if (client.status === "inactive") {
      return { allowed: false, reason: "Cliente inactivo en el sistema" }
    }

    if (client.cuota !== "Activa") {
      return { allowed: false, reason: "Cuota pendiente o vencida" }
    }

    if (client.aptoFisico !== "Vigente") {
      return { allowed: false, reason: "Apto físico pendiente o vencido" }
    }

    return { allowed: true, reason: "Acceso autorizado" }
  }

  // El backend valida el acceso (cuota activa, apto vigente, cliente habilitado) y
  // responde el motivo si lo deniega.
  const handleRegisterAttendance = async (clientId: number | null) => {
    if (!clientId) {
      setAttendanceMessage({ type: "error", text: "Seleccioná un cliente" })
      return
    }
    const client = clientList.find((item) => item.id === clientId)
    const clientName = client?.name ?? "cliente"

    setRegisteringAttendance(true)
    try {
      const attendance = await attendanceService.register(clientId)
      setAttendanceList((prev) => [
        {
          id: attendance.id,
          name: clientName,
          time: new Date(attendance.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ])
      setAttendanceForm({ clientId: null })
      setAttendanceMessage({ type: "success", text: `Ingreso registrado: ${clientName}` })
    } catch (error) {
      setAttendanceMessage({
        type: "error",
        text: `Acceso denegado para ${clientName}: ${getErrorMessage(error, "no se pudo registrar la asistencia")}`,
      })
    } finally {
      setRegisteringAttendance(false)
      // Un ingreso denegado puede cambiar el estado del cliente en el backend: se resincroniza.
      loadClients()
      loadStats()
    }
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
      handleRegisterAttendance(selectedClient.id)
      setIsScanning(false)
      setScanStatus(`QR validado: ${selectedClient.name} ingresó automáticamente`)
    }, 700)
  }

  const openClientDetail = (client: ClientRecord) => {
    setDetailClientId(client.id)
    setIsEditingClient(false)
    setEditErrors({})
  }

  const closeClientDetail = () => {
    setDetailClientId(null)
    setIsEditingClient(false)
    setEditErrors({})
  }

  const startEditingClient = () => {
    if (!showClientDetail) return
    setEditForm({
      nombre: showClientDetail.nombre,
      apellido: showClientDetail.apellido,
      telefono: showClientDetail.phone,
      objetivoEntrenamiento: showClientDetail.objetivo,
    })
    setEditErrors({})
    setIsEditingClient(true)
  }

  const handleSaveClient = async () => {
    if (!showClientDetail) return
    const errors: Record<string, string> = {}
    if (!editForm.nombre.trim()) errors.nombre = "Ingresá el nombre"
    if (!editForm.apellido.trim()) errors.apellido = "Ingresá el apellido"
    if (!editForm.telefono.trim()) errors.telefono = "Ingresá el teléfono"
    setEditErrors(errors)
    if (Object.keys(errors).length) return

    setSavingClient(true)
    try {
      const updated = await clientsService.update(showClientDetail.id, {
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        telefono: editForm.telefono.trim(),
        objetivoEntrenamiento: editForm.objetivoEntrenamiento.trim(),
      })
      setClientList((prev) => prev.map((client) => (client.id === updated.id ? mapClient(updated) : client)))
      setIsEditingClient(false)
      toast.success("Cliente actualizado correctamente")
    } catch (error) {
      const apiErrors = fieldErrorsFromApi(error)
      if (Object.keys(apiErrors).length) setEditErrors(apiErrors)
      toast.error(getErrorMessage(error, "No se pudo actualizar el cliente"))
    } finally {
      setSavingClient(false)
    }
  }

  // El estado del apto no cambia al tocar el botón: recién cuando el archivo se sube
  // el backend guarda el archivo, la fecha de carga (hoy) y el vencimiento (+1 año).
  const handleAptoFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !showClientDetail) return

    if (!APTO_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de archivo no permitido. Usá PDF, JPG, PNG o WEBP")
      return
    }
    if (file.size > APTO_MAX_BYTES) {
      toast.error("El archivo supera el máximo de 5 MB")
      return
    }

    setUploadingApto(true)
    try {
      const updated = await clientsService.uploadMedicalClearance(showClientDetail.id, file)
      const mapped = mapClient(updated)
      setClientList((prev) => prev.map((client) => (client.id === mapped.id ? mapped : client)))
      toast.success(`Apto físico cargado. Vence el ${mapped.aptoExpires}`)
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo cargar el apto físico"))
    } finally {
      setUploadingApto(false)
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
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && client.status === "active") ||
      // "Pagos pendientes": la cuota MÁS RECIENTE del cliente está en estado PENDIENTE.
      (filterStatus === "cuota_pendiente" && client.cuota === "Pendiente") ||
      // Igual que la card "Clientes inactivos": inhabilitados por pago o por baja.
      (filterStatus === "inactive" && client.status !== "active")
    return matchesSearch && matchesStatus
  })

  const closeNewClient = () => {
    setShowNewClient(false)
    setNewClientForm(emptyNewClientForm)
    setNewClientErrors({})
  }

  const updateNewClientField = (field: keyof NewClientForm, value: string) => {
    setNewClientForm((prev) => ({ ...prev, [field]: value }))
    setNewClientErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleCreateClient = async () => {
    // Si falta algo obligatorio se marca el campo y NO se envía la petición.
    const errors = validateNewClient(newClientForm)
    setNewClientErrors(errors)
    if (Object.keys(errors).length) return

    setCreatingClient(true)
    try {
      const created = await clientsService.create({
        nombre: newClientForm.nombre.trim(),
        apellido: newClientForm.apellido.trim(),
        email: newClientForm.email.trim(),
        password: newClientForm.password,
        telefono: newClientForm.telefono.trim(),
        objetivoEntrenamiento: newClientForm.objetivoEntrenamiento.trim() || undefined,
        planId: Number(newClientForm.planId),
      })
      setClientList((prev) => [mapClient(created), ...prev])
      closeNewClient()
      setActiveTab("clientes")
      toast.success("Cliente registrado. Su primera cuota quedó pendiente de pago.")
      loadStats()
    } catch (error) {
      const apiErrors = fieldErrorsFromApi(error)
      if (Object.keys(apiErrors).length) {
        setNewClientErrors(apiErrors)
      } else if ((error as { response?: { status?: number } })?.response?.status === 409) {
        // Email ya registrado: se marca en el campo en vez de un aviso genérico.
        setNewClientErrors({ email: getErrorMessage(error) })
      } else {
        toast.error(getErrorMessage(error, "No se pudo registrar el cliente"))
      }
    } finally {
      setCreatingClient(false)
    }
  }

  const handleSaveProfile = async () => {
    const errors: Record<string, string> = {}
    if (!profileForm.nombre.trim()) errors.nombre = "Ingresá tu nombre"
    if (!profileForm.apellido.trim()) errors.apellido = "Ingresá tu apellido"
    if (!profileForm.email.trim()) errors.email = "Ingresá tu email"
    else if (!EMAIL_PATTERN.test(profileForm.email.trim())) errors.email = "El email no es válido"
    setProfileErrors(errors)
    if (Object.keys(errors).length) return

    setSavingProfile(true)
    try {
      const updatedUser = await recepcionService.updateProfile({
        nombre: profileForm.nombre.trim(),
        apellido: profileForm.apellido.trim(),
        email: profileForm.email.trim(),
        telefono: profileForm.telefono.trim(),
      })
      updateUser(updatedUser)
      setProfileForm({
        nombre: updatedUser.nombre,
        apellido: updatedUser.apellido,
        email: updatedUser.email,
        telefono: updatedUser.telefono ?? "",
      })
      toast.success("Datos actualizados correctamente")
    } catch (error) {
      const apiErrors = fieldErrorsFromApi(error)
      if (Object.keys(apiErrors).length) setProfileErrors(apiErrors)
      else if ((error as { response?: { status?: number } })?.response?.status === 409) {
        setProfileErrors({ email: getErrorMessage(error) })
      } else toast.error(getErrorMessage(error, "No se pudieron guardar los datos"))
    } finally {
      setSavingProfile(false)
    }
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
    <div className="flex min-h-screen w-full flex-col bg-background pb-20 lg:pb-0 lg:pl-64">
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
      <main className="w-full flex-1 p-4 lg:p-6">
        {activeTab === "home" && (
          <div className="space-y-6 w-full">
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
                <p className="text-2xl font-bold text-foreground">{stats?.clientesActivos ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                <p className="text-xs text-muted-foreground mt-1">Habilitados</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.clientesInactivos ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Clientes Inactivos</p>
                <p className="text-xs text-muted-foreground mt-1">Inhabilitados por pago o baja</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.pagosPendientes ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                <p className="text-xs text-muted-foreground mt-1">Cuotas sin confirmar</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.asistenciasHoy ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Asistencias Hoy</p>
              </div>
            </div>

            {/* Main action */}
            <button
              onClick={() => setShowNewClient(true)}
              className="w-full bg-primary text-primary-foreground rounded-2xl px-6 py-8 flex items-center justify-center gap-4 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-10 h-10" />
              <span className="text-2xl font-bold">Nuevo Cliente</span>
            </button>

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
                {paymentList.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">Todavía no se registraron pagos.</p>
                )}
                {paymentList.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{payment.cliente.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.fechaPago).toLocaleDateString("es-AR")} • {formatMethodName(payment.metodoPago)}
                      </p>
                    </div>
                    <span className="font-semibold text-green-500">{formatPrice(payment.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="space-y-6 w-full">
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
                <option value="cuota_pendiente">Pagos pendientes</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            {/* Clients List */}
            <div className="space-y-3">
              {filteredClients.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No hay clientes para mostrar.</p>
              )}
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => openClientDetail(client)}
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
                    <span className={`text-sm ${client.aptoFisico === "Vigente" ? "text-green-500" : client.aptoFisico === "Vencido" ? "text-red-500" : "text-yellow-500"}`}>
                      Apto: {client.aptoFisico}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "pagos" && (
          <div className="space-y-6 w-full">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
              <p className="text-muted-foreground mt-1">Gestiona los pagos de los clientes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Ingresos del Día</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats ? formatPrice(stats.ingresosDelDia) : "—"}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
                <p className="text-2xl font-bold text-green-500 mt-1">{stats ? formatPrice(stats.ingresosDelMes) : "—"}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                <p className="text-2xl font-bold text-yellow-500 mt-1">{stats?.pagosPendientes ?? "—"}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Asistencias Hoy</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.asistenciasHoy ?? "—"}</p>
              </div>
            </div>

            {/* Register Payment */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-1">Registrar Pago</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Confirma el pago de la cuota pendiente del cliente: la cuota pasa a activa.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Cliente</label>
                  <ClientSelect
                    options={clientList.map((client) => ({ id: client.id, label: client.name, hint: client.email }))}
                    value={paymentForm.clientId}
                    onChange={selectPaymentClient}
                    placeholder="Buscar o elegir cliente"
                    invalid={Boolean(paymentError) && !paymentClient}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => {
                      setPaymentError("")
                      setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                    }}
                    placeholder="Monto"
                    className={inputClass()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Método de pago</label>
                  <select
                    value={paymentMethodId}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, methodId: e.target.value }))}
                    disabled={paymentMethods.length === 0}
                    className={inputClass()}
                  >
                    {paymentMethods.length === 0 && <option value="">Cargando métodos...</option>}
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {formatMethodName(method.nombre)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {paymentClient && paymentQuota && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Cuota pendiente: <span className="text-foreground font-medium">{paymentQuota.planName}</span> —
                  precio del plan {formatPrice(paymentQuota.price)}
                </p>
              )}
              {paymentClient && !paymentQuota && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-yellow-500">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Este cliente no tiene una cuota pendiente de pago.
                </p>
              )}
              <div className="mt-3">
                <FieldError message={paymentError} />
              </div>

              <button
                onClick={handleRegisterPayment}
                disabled={registeringPayment}
                className="mt-4 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <DollarSign className="w-5 h-5" />
                {registeringPayment ? "Registrando..." : "Registrar Pago"}
              </button>
            </div>

            {/* Recent Payments */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Historial de Pagos</h2>
              </div>
              <div className="divide-y divide-border">
                {paymentList.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">Todavía no se registraron pagos.</p>
                )}
                {paymentList.map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{payment.cliente.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.fechaPago).toLocaleDateString("es-AR")} • {formatMethodName(payment.metodoPago)} • {payment.plan}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">{formatPrice(payment.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "asistencia" && (
          <div className="space-y-6 w-full">
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
            {/* Sin overflow-hidden: el desplegable del select de clientes no debe recortarse */}
            <div className="bg-card border border-border rounded-2xl">
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

                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <ClientSelect
                        options={clientList.map((client) => ({ id: client.id, label: client.name, hint: client.email }))}
                        value={attendanceForm.clientId}
                        onChange={(clientId) => {
                          setAttendanceMessage(null)
                          setAttendanceForm({ clientId })
                        }}
                        placeholder="Ingreso manual (respaldo): elegí un cliente"
                        invalid={attendanceMessage?.type === "error" && !attendanceForm.clientId}
                      />
                    </div>
                    <button
                      onClick={() => handleRegisterAttendance(attendanceForm.clientId)}
                      disabled={registeringAttendance}
                      className="px-4 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {registeringAttendance ? "Registrando..." : "Asistencia"}
                    </button>
                  </div>
                  {attendanceMessage?.type === "error" && <FieldError message={attendanceMessage.text} />}
                  {attendanceMessage?.type === "success" && (
                    <p className="flex items-center gap-1.5 text-sm text-green-500">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      {attendanceMessage.text}
                    </p>
                  )}
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
          <div className="space-y-6 w-full">
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
          <div className="space-y-6 w-full">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
              <p className="text-muted-foreground mt-1">Gestioná tus datos y tu contraseña</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Datos básicos (del recepcionista logueado) */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nombre</label>
                      <input
                        type="text"
                        value={profileForm.nombre}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        className={inputClass(Boolean(profileErrors.nombre))}
                      />
                      <FieldError message={profileErrors.nombre} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Apellido</label>
                      <input
                        type="text"
                        value={profileForm.apellido}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, apellido: e.target.value }))}
                        className={inputClass(Boolean(profileErrors.apellido))}
                      />
                      <FieldError message={profileErrors.apellido} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                      className={inputClass(Boolean(profileErrors.email))}
                    />
                    <FieldError message={profileErrors.email} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Teléfono / Contacto</label>
                    <input
                      type="tel"
                      value={profileForm.telefono}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+54 11 1234-5678"
                      className={inputClass(Boolean(profileErrors.telefono))}
                    />
                    <FieldError message={profileErrors.telefono} />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </div>

              {/* Cambio de contraseña temporal */}
              <ChangePasswordCard />
            </div>

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
                onClick={closeNewClient}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nombre</label>
                  <input
                    type="text"
                    value={newClientForm.nombre}
                    onChange={(e) => updateNewClientField("nombre", e.target.value)}
                    placeholder="Juan"
                    className={inputClass(Boolean(newClientErrors.nombre))}
                  />
                  <FieldError message={newClientErrors.nombre} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Apellido</label>
                  <input
                    type="text"
                    value={newClientForm.apellido}
                    onChange={(e) => updateNewClientField("apellido", e.target.value)}
                    placeholder="Pérez"
                    className={inputClass(Boolean(newClientErrors.apellido))}
                  />
                  <FieldError message={newClientErrors.apellido} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => updateNewClientField("email", e.target.value)}
                  placeholder="juan@email.com"
                  className={inputClass(Boolean(newClientErrors.email))}
                />
                <FieldError message={newClientErrors.email} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teléfono</label>
                <input
                  type="tel"
                  value={newClientForm.telefono}
                  onChange={(e) => updateNewClientField("telefono", e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className={inputClass(Boolean(newClientErrors.telefono))}
                />
                <FieldError message={newClientErrors.telefono} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Contraseña inicial</label>
                <input
                  type="password"
                  value={newClientForm.password}
                  onChange={(e) => updateNewClientField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass(Boolean(newClientErrors.password))}
                />
                <FieldError message={newClientErrors.password} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Objetivo de entrenamiento <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={newClientForm.objetivoEntrenamiento}
                  onChange={(e) => updateNewClientField("objetivoEntrenamiento", e.target.value)}
                  maxLength={255}
                  placeholder="Ej: bajar de peso, ganar masa muscular"
                  className={inputClass(Boolean(newClientErrors.objetivoEntrenamiento))}
                />
                <FieldError message={newClientErrors.objetivoEntrenamiento} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Plan</label>
                <select
                  value={newClientForm.planId}
                  onChange={(e) => updateNewClientField("planId", e.target.value)}
                  className={inputClass(Boolean(newClientErrors.planId))}
                >
                  <option value="">Seleccioná un plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} — {formatPrice(plan.precio)} ({plan.duracionDias} días)
                    </option>
                  ))}
                </select>
                <FieldError message={newClientErrors.planId} />
                <p className="text-xs text-muted-foreground">
                  La primera cuota queda pendiente hasta que se registre el pago en la sección Pagos.
                </p>
              </div>
              <button
                onClick={handleCreateClient}
                disabled={creatingClient}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creatingClient ? "Registrando..." : "Registrar Cliente"}
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
                onClick={closeClientDetail}
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

              {isEditingClient ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nombre</label>
                      <input
                        type="text"
                        value={editForm.nombre}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        className={inputClass(Boolean(editErrors.nombre))}
                      />
                      <FieldError message={editErrors.nombre} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Apellido</label>
                      <input
                        type="text"
                        value={editForm.apellido}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, apellido: e.target.value }))}
                        className={inputClass(Boolean(editErrors.apellido))}
                      />
                      <FieldError message={editErrors.apellido} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Teléfono</label>
                    <input
                      type="tel"
                      value={editForm.telefono}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, telefono: e.target.value }))}
                      className={inputClass(Boolean(editErrors.telefono))}
                    />
                    <FieldError message={editErrors.telefono} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Objetivo de entrenamiento</label>
                    <input
                      type="text"
                      value={editForm.objetivoEntrenamiento}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, objetivoEntrenamiento: e.target.value }))}
                      maxLength={255}
                      className={inputClass(Boolean(editErrors.objetivoEntrenamiento))}
                    />
                    <FieldError message={editErrors.objetivoEntrenamiento} />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{showClientDetail.email}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{showClientDetail.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{showClientDetail.phone || "-"}</span>
                  </div>
                  <div className="p-3 bg-secondary rounded-xl">
                    <p className="text-sm text-muted-foreground">Objetivo de entrenamiento</p>
                    <p className="font-medium text-foreground">{showClientDetail.objetivo || "-"}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium text-foreground">{showClientDetail.plan}</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Cuota</p>
                  <p className={`font-medium ${showClientDetail.cuota === "Activa" ? "text-green-500" : showClientDetail.cuota === "Vencida" ? "text-red-500" : "text-yellow-500"}`}>
                    {showClientDetail.cuota}
                  </p>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Vence Cuota</p>
                  <p className="font-medium text-foreground">{showClientDetail.cuotaExpires}</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">Apto Físico</p>
                  <p className={`font-medium ${showClientDetail.aptoFisico === "Vigente" ? "text-green-500" : showClientDetail.aptoFisico === "Vencido" ? "text-red-500" : "text-yellow-500"}`}>
                    {showClientDetail.aptoFisico}
                  </p>
                </div>
              </div>

              {/* Apto Físico Upload */}
              <div className="p-4 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showClientDetail.aptoFisico === "Vigente" ? "bg-green-500/10" : showClientDetail.aptoFisico === "Vencido" ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
                      <FileCheck className={`w-5 h-5 ${showClientDetail.aptoFisico === "Vigente" ? "text-green-500" : showClientDetail.aptoFisico === "Vencido" ? "text-red-500" : "text-yellow-500"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Apto Físico</p>
                      {showClientDetail.aptoFisico === "Vigente" ? (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">Vigente</span>
                      ) : showClientDetail.aptoFisico === "Vencido" ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs rounded-full font-medium">Vencido</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full font-medium">Sin cargar</span>
                      )}
                    </div>
                  </div>
                  {showClientDetail.aptoFisico !== "Sin cargar" && (
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Cargado: {showClientDetail.aptoLoadedAt}</p>
                      <p>Vence: {showClientDetail.aptoExpires}</p>
                    </div>
                  )}
                </div>
                <input
                  ref={aptoInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleAptoFileSelected}
                  className="hidden"
                />
                <button
                  onClick={() => aptoInputRef.current?.click()}
                  disabled={uploadingApto}
                  className="w-full py-2.5 bg-secondary text-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingApto
                    ? "Subiendo..."
                    : showClientDetail.aptoFisico === "Sin cargar"
                      ? "Cargar Apto Físico"
                      : "Actualizar Apto Físico"}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  El cliente entrega el apto físico en recepción y se carga desde aquí (PDF, JPG, PNG o WEBP, máx. 5 MB).
                  Vale por 1 año desde la carga.
                </p>
              </div>

              <div className="flex gap-3">
                {isEditingClient ? (
                  <>
                    <button
                      onClick={handleSaveClient}
                      disabled={savingClient}
                      className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingClient ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingClient(false)
                        setEditErrors({})
                      }}
                      disabled={savingClient}
                      className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        selectPaymentClient(showClientDetail.id)
                        setActiveTab("pagos")
                        closeClientDetail()
                      }}
                      className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Registrar Pago
                    </button>
                    <button
                      onClick={startEditingClient}
                      className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
                    >
                      Editar
                    </button>
                  </>
                )}
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
