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
import { formatGymDate, formatGymTime, gymTodayBounds } from "@/utils/gym-time"
import { isValidPhone, PHONE_MESSAGE } from "@/utils/phone"
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
  // Días de racha por semana (1-7). null = sin objetivo definido.
  racha: number | null
  plan: string
  status: ClientStatus
  cuota: "Activa" | "Vencida" | "Pendiente" | "Sin cuota"
  cuotaExpires: string
  // Cuota PENDIENTE más reciente del cliente: es la que se confirma al registrar un pago.
  pendingQuota: { id: number; planName: string; price: number } | null
  // Todas las cuotas pendientes sin pago (puede haber varias por reintentos).
  pendingQuotas: Array<{ id: number; planName: string; price: number }>
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
  // Cuota que se muestra en la lista: la ACTIVA si hay una (una solicitud pendiente más nueva no la tapa); si no, la más reciente.
  const latestQuota = client.cuotas.find((quota) => quota.estadoCuota.nombre === "ACTIVA") ?? client.cuotas[0]
  const pendingQuota = client.cuotas.find((quota) => quota.estadoCuota.nombre === "PENDIENTE" && !quota.pago)
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
    racha: client.objetivoDiasRacha ?? null,
    plan: latestQuota?.plan.nombre ?? "Sin plan",
    status: clientStatus,
    cuota: quotaStatus,
    cuotaExpires: formatDateOnly(latestQuota?.fechaVencimiento),
    pendingQuotas: client.cuotas
      .filter((quota) => quota.estadoCuota.nombre === "PENDIENTE" && !quota.pago)
      .map((quota) => ({ id: quota.id, planName: quota.plan.nombre, price: quota.montoACobrar ?? Number(quota.plan.precio) })),
    pendingQuota: pendingQuota
      ? { id: pendingQuota.id, planName: pendingQuota.plan.nombre, price: pendingQuota.montoACobrar ?? Number(pendingQuota.plan.precio) }
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
const STREAK_PATTERN = /^[1-7]$/
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
  objetivoDiasRacha: string
  planId: string
}

const emptyNewClientForm: NewClientForm = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  password: "",
  objetivoEntrenamiento: "",
  // Sin valor por defecto: el recepcionista debe ingresarlo.
  objetivoDiasRacha: "",
  planId: "",
}

const validateNewClient = (form: NewClientForm) => {
  const errors: Record<string, string> = {}
  if (!form.nombre.trim()) errors.nombre = "Ingresá el nombre del cliente"
  if (!form.apellido.trim()) errors.apellido = "Ingresá el apellido del cliente"
  if (!form.email.trim()) errors.email = "Ingresá el email"
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "El email no es válido"
  if (!form.telefono.trim()) errors.telefono = "Ingresá el teléfono"
  else if (!isValidPhone(form.telefono)) errors.telefono = PHONE_MESSAGE
  if (!form.password) errors.password = "Ingresá una contraseña inicial"
  else if (form.password.length < 6) errors.password = "La contraseña debe tener al menos 6 caracteres"
  if (!form.objetivoDiasRacha.trim()) errors.objetivoDiasRacha = "Ingresá los días de racha por semana (de 1 a 7)"
  else if (!STREAK_PATTERN.test(form.objetivoDiasRacha.trim())) errors.objetivoDiasRacha = "Tiene que ser un número entero entre 1 y 7"
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
  const [editForm, setEditForm] = useState({ nombre: "", apellido: "", telefono: "", objetivoEntrenamiento: "", objetivoDiasRacha: "" })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [savingClient, setSavingClient] = useState(false)
  const [uploadingApto, setUploadingApto] = useState(false)
  const aptoInputRef = useRef<HTMLInputElement>(null)

  // Datos reales de las cards y del historial de pagos
  const [stats, setStats] = useState<ReceptionStats | null>(null)
  const [paymentList, setPaymentList] = useState<ReceptionPayment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  const [attendanceList, setAttendanceList] = useState<{ id: number; name: string; time: string }[]>([])

  const loadClients = useCallback(() => {
    return clientsService
      .list()
      .then((clients) => setClientList(clients.map(mapClient)))
      .catch((error) => toast.error(getErrorMessage(error, "No se pudieron cargar los clientes")))
  }, [])

  // Errores de carga de las cards, pagos y asistencias: se muestran con un botón de reintentar (no se tragan en silencio).
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadStats = useCallback(() => {
    return recepcionService
      .getStats()
      .then((value) => {
        setStats(value)
        setLoadError(null)
      })
      .catch((error) => setLoadError(getErrorMessage(error, "No se pudieron cargar los datos de recepción")))
  }, [])

  const loadPayments = useCallback(() => {
    return recepcionService
      .listPayments(50)
      .then(setPaymentList)
      .catch((error) => setLoadError(getErrorMessage(error, "No se pudieron cargar los pagos")))
  }, [])

  const loadAttendance = useCallback(() => {
    // "Hoy" en hora de Buenos Aires (no la del navegador); el límite superior es exclusivo en la práctica (00:00 del día siguiente).
    const { desde, hasta } = gymTodayBounds()
    return attendanceService
      .list({ desde, hasta })
      .then((items) =>
        setAttendanceList(
          items.map((item) => ({
            id: item.id,
            name: `${item.cliente.usuario.nombre} ${item.cliente.usuario.apellido}`.trim(),
            time: formatGymTime(item.fechaHora),
          })),
        ),
      )
      .catch((error) => setLoadError(getErrorMessage(error, "No se pudieron cargar las asistencias de hoy")))
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
  // Registrar pago
  // `target`: "c:<id>" = cuota pendiente del cliente, "p:<id>" = plan a cobrar (renovación sin solicitud previa).
  const [paymentForm, setPaymentForm] = useState<{ clientId: number | null; target: string; methodId: string }>({
    clientId: null,
    target: "",
    methodId: "",
  })
  const [paymentError, setPaymentError] = useState("")
  const [registeringPayment, setRegisteringPayment] = useState(false)
  const paymentClient = clientList.find((client) => client.id === paymentForm.clientId) ?? null
  // Opciones de cobro: primero las cuotas pendientes del cliente, después los planes activos.
  const paymentOptions = [
    ...(paymentClient?.pendingQuotas ?? []).map((quota) => ({ value: `c:${quota.id}`, label: `Cuota pendiente · ${quota.planName}`, price: quota.price })),
    ...plans.map((plan) => ({ value: `p:${plan.id}`, label: `Plan · ${plan.nombre}${plan.promocion ? ` (${plan.promocion.descuento}% OFF)` : ""}`, price: plan.precioFinal })),
  ]
  const paymentTarget = paymentForm.target || paymentOptions[0]?.value || ""
  const paymentChoice = paymentOptions.find((option) => option.value === paymentTarget) ?? null
  const paymentMethodId = paymentForm.methodId || (paymentMethods[0] ? String(paymentMethods[0].id) : "")

  // Asistencia
  const [attendanceForm, setAttendanceForm] = useState<{ clientId: number | null }>({ clientId: null })
  const [attendanceMessage, setAttendanceMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [registeringAttendance, setRegisteringAttendance] = useState(false)


  // Configuración (datos del recepcionista logueado)
  const [profileForm, setProfileForm] = useState({
    nombre: user?.nombre ?? "",
    apellido: user?.apellido ?? "",
    email: user?.email ?? "",
    telefono: user?.telefono ?? "",
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [savingProfile, setSavingProfile] = useState(false)

  const selectPaymentClient = (clientId: number | null) => {
    const client = clientList.find((item) => item.id === clientId)
    setPaymentError("")
    // Al elegir cliente se propone su cuota pendiente (o el primer plan) y el monto sale del backend.
    setPaymentForm((prev) => ({ ...prev, clientId, target: client?.pendingQuotas[0] ? `c:${client.pendingQuotas[0].id}` : "" }))
  }

  const handleRegisterPayment = async () => {
    if (registeringPayment) return
    if (!paymentClient) return setPaymentError("Seleccioná un cliente")
    if (!paymentChoice) return setPaymentError("Elegí la cuota pendiente o el plan a cobrar")
    if (!paymentMethodId) return setPaymentError("Seleccioná un método de pago")

    setPaymentError("")
    setRegisteringPayment(true)
    try {
      const [kind, id] = paymentTarget.split(":")
      await recepcionService.registerPayment({
        clienteId: paymentClient.id,
        ...(kind === "c" ? { cuotaId: Number(id) } : { planId: Number(id) }),
        metodoPagoId: Number(paymentMethodId),
      })
      toast.success(`Pago registrado: ${paymentClient.name}`)
      setPaymentForm({ clientId: null, target: "", methodId: "" })
      await Promise.all([loadClients(), loadPayments(), loadStats()])
    } catch (error) {
      setPaymentError(getErrorMessage(error, "No se pudo registrar el pago"))
    } finally {
      setRegisteringPayment(false)
    }
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
          time: formatGymTime(attendance.fechaHora),
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
      objetivoDiasRacha: showClientDetail.racha === null ? "" : String(showClientDetail.racha),
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
    else if (!isValidPhone(editForm.telefono)) errors.telefono = PHONE_MESSAGE
    // En la edición el campo puede quedar vacío (cliente sin objetivo); si se completa, entero de 1 a 7.
    if (editForm.objetivoDiasRacha.trim() && !STREAK_PATTERN.test(editForm.objetivoDiasRacha.trim())) errors.objetivoDiasRacha = "Tiene que ser un número entero entre 1 y 7"
    setEditErrors(errors)
    if (Object.keys(errors).length) return

    setSavingClient(true)
    try {
      const updated = await clientsService.update(showClientDetail.id, {
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        telefono: editForm.telefono.trim(),
        objetivoEntrenamiento: editForm.objetivoEntrenamiento.trim(),
        ...(editForm.objetivoDiasRacha.trim() ? { objetivoDiasRacha: Number(editForm.objetivoDiasRacha.trim()) } : {}),
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
      // "Pagos pendientes": el cliente tiene al menos una cuota PENDIENTE sin pago (igual que la card de Inicio y Pagos).
      (filterStatus === "cuota_pendiente" && client.pendingQuotas.length > 0) ||
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
        objetivoDiasRacha: Number(newClientForm.objetivoDiasRacha.trim()),
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
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 p-4 lg:p-6">
        {loadError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="flex items-center gap-2 text-sm text-red-500">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {loadError}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null)
                void Promise.all([loadClients(), loadStats(), loadPayments(), loadAttendance()])
              }}
              className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/70"
            >
              Reintentar
            </button>
          </div>
        )}
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
                        {formatGymDate(payment.fechaPago)} • {formatMethodName(payment.metodoPago)}
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
                Elegí el cliente y qué se cobra (su cuota pendiente o un plan). El monto lo calcula el sistema con el precio vigente y la membresía arranca hoy.
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
                  <label className="text-sm font-medium text-foreground" htmlFor="pago-concepto">Qué se cobra</label>
                  <select
                    id="pago-concepto"
                    value={paymentTarget}
                    disabled={!paymentClient}
                    onChange={(e) => {
                      setPaymentError("")
                      setPaymentForm((prev) => ({ ...prev, target: e.target.value }))
                    }}
                    className={inputClass()}
                  >
                    {!paymentClient && <option value="">Elegí primero un cliente</option>}
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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

              {paymentClient && paymentChoice && (
                <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
                  Monto a cobrar: <span className="text-foreground text-lg font-semibold">{formatPrice(paymentChoice.price)}</span>
                  <span className="ml-2 text-xs">(precio del plan con la promoción vigente; no se puede editar)</span>
                </p>
              )}
              {paymentClient && paymentOptions.length === 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-yellow-500">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  No hay planes activos para cobrar. Cargalos en el panel de administración.
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
                          {formatGymDate(payment.fechaPago)} • {formatMethodName(payment.metodoPago)} • {payment.plan}
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
              <p className="text-muted-foreground mt-1">Registrá el ingreso de cada cliente: el sistema valida su estado, cuota y apto físico</p>
            </div>

            {/* Automatic Sync Notice */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">Control de acceso</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Al registrar el ingreso se verifica que el cliente esté habilitado, tenga la cuota vigente (con 3 días de
                    tolerancia tras el vencimiento) y el apto físico al día. La hora queda guardada en hora de Buenos Aires.
                  </p>
                </div>
              </div>
            </div>

            {/* Today's Attendance */}
            {/* Sin overflow-hidden: el desplegable del select de clientes no debe recortarse */}
            <div className="bg-card border border-border rounded-2xl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Asistencias de Hoy ({attendanceList.length})</h2>
                <span className="text-sm text-muted-foreground">{formatGymDate(new Date())}</span>
              </div>

              <div className="p-4 border-b border-border space-y-4">
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
                        placeholder="Elegí el cliente que ingresa"
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
                        <p className="text-xs text-muted-foreground">Ingreso registrado en recepción</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground">{entry.time}</span>
                  </div>
                ))}
              </div>
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
                <label htmlFor="nuevo-cliente-racha" className="text-sm font-medium text-foreground">
                  Días de racha por semana (objetivo)
                </label>
                <input
                  id="nuevo-cliente-racha"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={7}
                  step={1}
                  required
                  value={newClientForm.objetivoDiasRacha}
                  onChange={(e) => updateNewClientField("objetivoDiasRacha", e.target.value)}
                  className={inputClass(Boolean(newClientErrors.objetivoDiasRacha))}
                />
                <FieldError message={newClientErrors.objetivoDiasRacha} />
                <p className="text-xs text-muted-foreground">Entero de 1 a 7. Es la meta semanal de asistencia que verá el cliente.</p>
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
                  <div className="space-y-1.5">
                    <label htmlFor="editar-cliente-racha" className="text-sm font-medium text-foreground">
                      Días de racha por semana (objetivo)
                    </label>
                    <input
                      id="editar-cliente-racha"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={7}
                      step={1}
                      value={editForm.objetivoDiasRacha}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, objetivoDiasRacha: e.target.value }))}
                      className={inputClass(Boolean(editErrors.objetivoDiasRacha))}
                    />
                    <FieldError message={editErrors.objetivoDiasRacha} />
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
                  <div className="p-3 bg-secondary rounded-xl">
                    <p className="text-sm text-muted-foreground">Días de racha por semana (objetivo)</p>
                    <p className="font-medium text-foreground">{showClientDetail.racha === null ? "Sin definir" : `${showClientDetail.racha} ${showClientDetail.racha === 1 ? "día" : "días"}`}</p>
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

    </div>
  )
}
