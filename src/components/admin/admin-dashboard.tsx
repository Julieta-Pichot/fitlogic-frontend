import { useEffect, useState } from "react"
import {
  Home,
  Users,
  CreditCard,
  Settings,
  Bell,
  Plus,
  TrendingUp,
  Package,
  Shield,
  Calendar,
  Star,
  Edit,
  Trash2,
  X,
  DollarSign,
  ShoppingBag,
  Tag,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  ImageIcon,
  Upload,
} from "lucide-react"
import toast from "react-hot-toast"
import { NotificationsPanel } from "@/components/shared/notifications-panel"
import { ChangePasswordCard } from "@/components/shared/change-password-card"
import { UsersManagement } from "@/features/admin/users/users-management"
import { configService, plansService, productsService, promotionsService } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"

interface AdminDashboardProps {
  userName: string
  onLogout: () => void
}

type TabType = "home" | "usuarios" | "planes" | "promociones" | "productos" | "configuracion"

type PlanRecord = {
  id: number
  nombre: string
  duracionDias: number
  precio: number | string
  activo: number
}

type ProductRecord = {
  id: number
  nombre: string
  categoria?: number | string
  category?: string
  precio: number | string
  stock: number
  activo?: number
  descripcion?: string | null
}

const initialPlans: PlanRecord[] = []

type PromoType = "tienda" | "planes"

const initialPromotions: {
  id: number
  name: string
  description: string
  discount: string
  validUntil: string
  active: boolean
  type: PromoType
}[] = [
  { id: 1, name: "2x1 Primer Mes", description: "Trae un amigo y entrenan ambos por el precio de uno", discount: "50%", validUntil: "31/03/2026", active: true, type: "planes" },
  { id: 2, name: "Verano Fit", description: "20% de descuento en plan trimestral", discount: "20%", validUntil: "28/02/2026", active: true, type: "planes" },
  { id: 3, name: "Black Week Suplementos", description: "30% off en proteínas y creatina", discount: "30%", validUntil: "30/11/2025", active: false, type: "tienda" },
  { id: 4, name: "Combo Indumentaria", description: "15% en remeras y accesorios de la tienda", discount: "15%", validUntil: "30/04/2026", active: true, type: "tienda" },
]

const initialProducts: ProductRecord[] = []

const trainerSpecialties = [
  "Musculación",
  "Funcional",
  "Cross Training",
  "Cardio",
  "Spinning",
  "Yoga",
  "Pilates",
  "Boxeo",
]

const topClasses = [
  { id: 1, name: "Spinning Intensivo", instructor: "Carlos López", enrolled: 156, rating: 4.8 },
  { id: 2, name: "Yoga Flow", instructor: "Ana Martínez", enrolled: 142, rating: 4.9 },
  { id: 3, name: "Funcional HIIT", instructor: "Carlos López", enrolled: 128, rating: 4.7 },
  { id: 4, name: "Pilates", instructor: "Laura Sánchez", enrolled: 98, rating: 4.6 },
]

function PromoCard({
  promo,
  onToggle,
  onDelete,
}: {
  promo: (typeof initialPromotions)[0]
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`bg-card border rounded-2xl p-5 ${
        promo.active ? "border-primary/50" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <Tag className="w-6 h-6 text-primary" />
        </div>
        <span className="text-2xl font-bold text-primary">{promo.discount}</span>
      </div>
      <h3 className="font-semibold text-foreground">{promo.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Vence: {promo.validUntil}</span>
        {promo.active ? (
          <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">
            Activa
          </span>
        ) : (
          <span className="px-2 py-1 bg-secondary text-muted-foreground text-xs rounded-full font-medium">
            Inactiva
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onToggle}
          className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          {promo.active ? "Desactivar" : "Activar"}
        </button>
        <button
          onClick={onDelete}
          aria-label={`Eliminar promoción ${promo.name}`}
          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function AdminDashboard({ userName, onLogout }: AdminDashboardProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [showActiveDetail, setShowActiveDetail] = useState(false)

  // Planes gestionables
  const [planList, setPlanList] = useState<PlanRecord[]>(initialPlans)
  const [newPlanForm, setNewPlanForm] = useState({ name: "", duration: "", price: "" })

  // Promociones (tienda / planes) gestionables
  const [promotionList, setPromotionList] = useState(initialPromotions)
  const [createPromoType, setCreatePromoType] = useState<PromoType | null>(null)
  const [newPromo, setNewPromo] = useState({ name: "", description: "", discount: "", validUntil: "" })
  const [gymForm, setGymForm] = useState({ name: user?.gimnasioNombre ?? "", address: "" })
  const [notificationSettings, setNotificationSettings] = useState({
    notifNuevoPago: true,
    notifAptoVencido: true,
    notifNuevoCliente: true,
  })

  // Productos / stock editable
  const [productList, setProductList] = useState<ProductRecord[]>(initialProducts)
  const [editProduct, setEditProduct] = useState<ProductRecord | null>(null)
  const [productForm, setProductForm] = useState({ price: 0, stock: 0 })
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    category: "Proteínas",
    price: "",
    stock: "",
    description: "",
  })

  // Alta de producto: descripción e imagen
  const [newProductDescription, setNewProductDescription] = useState("")
  const [newProductImage, setNewProductImage] = useState<string | null>(null)

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setNewProductImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const storePromos = promotionList.filter((p) => p.type === "tienda")
  const planPromos = promotionList.filter((p) => p.type === "planes")

  useEffect(() => {
    const loadAdminCatalog = async () => {
      try {
        const [plans, products, promotions] = await Promise.all([
          plansService.list(),
          productsService.list(),
          promotionsService.list(),
        ])

        setPlanList(
          plans.map((plan) => ({
            id: plan.id,
            nombre: plan.nombre,
            duracionDias: Number(plan.duracionDias),
            precio: Number(plan.precio ?? 0),
            activo: Number(plan.activo ?? 1),
          }))
        )

        setProductList(
          products.map((product) => ({
            id: product.id,
            nombre: product.nombre,
            categoria: product.categoria,
            category: product.categoria !== undefined ? mapCategory(product.categoria) : "Proteínas",
            precio: Number(product.precio ?? 0),
            stock: Number(product.stock ?? 0),
            activo: Number(product.activo ?? 1),
            descripcion: product.descripcion ?? null,
          }))
        )

        setPromotionList(
          promotions.map((promo) => ({
            id: promo.id,
            name: promo.nombre,
            description: promo.descripcion ?? "",
            discount: `${Number(promo.descuentoPorcentaje ?? 0)}%`,
            validUntil: promo.fechaFin ? new Date(promo.fechaFin).toLocaleDateString("es-AR") : "Sin vencimiento",
            active: Number(promo.activo ?? 1) === 1,
            type: Number(promo.tipo) === 2 ? "planes" : "tienda",
          }))
        )
      } catch {
        toast.error("No se pudo cargar el catálogo del gimnasio")
      }
    }

    loadAdminCatalog()
  }, [])

  const mapCategory = (category: number | string) => {
    if (category === 1 || category === "1" || category === "Proteínas" || category === "Proteinas") return "Proteínas"
    if (category === 2 || category === "2" || category === "Suplementos") return "Suplementos"
    if (category === 3 || category === "3" || category === "Ropa") return "Ropa"
    if (category === 4 || category === "4" || category === "Accesorios") return "Accesorios"
    return "Proteínas"
  }

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

  const createPromotion = async () => {
    if (!createPromoType || !newPromo.name.trim()) return

    try {
      const payload = {
        nombre: newPromo.name.trim(),
        descripcion: newPromo.description.trim(),
        descuentoPorcentaje: Number(newPromo.discount || 0),
        tipo: createPromoType === "planes" ? 2 : 1,
        fechaFin: newPromo.validUntil ? new Date(newPromo.validUntil).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const response = await promotionsService.create(payload)
      const promo = response.data as any

      setPromotionList((prev) => [{
        id: promo.id,
        name: promo.nombre,
        description: promo.descripcion ?? "",
        discount: `${Number(promo.descuentoPorcentaje ?? 0)}%`,
        validUntil: promo.fechaFin ? new Date(promo.fechaFin).toLocaleDateString("es-AR") : "Sin vencimiento",
        active: Number(promo.activo ?? 1) === 1,
        type: createPromoType,
      }, ...prev])

      setNewPromo({ name: "", description: "", discount: "", validUntil: "" })
      setCreatePromoType(null)
      toast.success("Promoción creada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la promoción")
    }
  }

  const createProduct = async () => {
    const name = newProductForm.name.trim()
    const price = Number(newProductForm.price)
    const stock = Number(newProductForm.stock)

    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
      return
    }

    try {
      const response = await productsService.create({
        nombre: name,
        categoria: newProductForm.category,
        precio: price,
        stock,
        descripcion: newProductForm.description,
      })

      const product = response.data as ProductRecord
      setProductList((prev) => [{
        id: product.id,
        nombre: product.nombre,
        categoria: product.categoria,
        category: product.categoria !== undefined ? mapCategory(product.categoria) : newProductForm.category,
        precio: Number(product.precio ?? 0),
        stock: Number(product.stock ?? 0),
        activo: Number(product.activo ?? 1),
        descripcion: product.descripcion ?? null,
      }, ...prev])

      setNewProductForm({
        name: "",
        category: "Proteínas",
        price: "",
        stock: "",
        description: "",
      })
      setNewProductDescription("")
      setNewProductImage(null)
      setShowCreateProduct(false)
      toast.success("Producto creado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el producto")
    }
  }

  const deletePromotion = async (id: number) => {
    try {
      await promotionsService.remove(id)
      setPromotionList((prev) => prev.filter((p) => p.id !== id))
      toast.success("Promoción eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la promoción")
    }
  }

  const togglePromotion = async (id: number) => {
    const promo = promotionList.find((p) => p.id === id)
    if (!promo) return

    try {
      const nextActive = !promo.active
      await promotionsService.toggleActive(id, nextActive ? 1 : 0)
      setPromotionList((prev) => prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p)))
      toast.success("Estado de la promoción actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado de la promoción")
    }
  }

  const saveGymConfig = async () => {
    if (!gymForm.name.trim()) {
      toast.error("El nombre del gimnasio es obligatorio")
      return
    }

    try {
      await configService.updateGym({
        nombre: gymForm.name.trim(),
        direccion: gymForm.address.trim(),
        notifNuevoPago: notificationSettings.notifNuevoPago ? 1 : 0,
        notifAptoVencido: notificationSettings.notifAptoVencido ? 1 : 0,
        notifNuevoCliente: notificationSettings.notifNuevoCliente ? 1 : 0,
      })
      toast.success("Configuración guardada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración")
    }
  }

  const saveProduct = async () => {
    if (!editProduct) return

    try {
      await productsService.update(editProduct.id, {
        precio: Math.max(0, productForm.price),
        stock: Math.max(0, productForm.stock),
      })

      setProductList((prev) =>
        prev.map((p) =>
          p.id === editProduct.id
            ? { ...p, precio: Math.max(0, productForm.price), stock: Math.max(0, productForm.stock) }
            : p,
        ),
      )
      setEditProduct(null)
      toast.success("Producto actualizado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el producto")
    }
  }

  const deleteProduct = async (id: number) => {
    try {
      await productsService.remove(id)
      setProductList((prev) => prev.filter((p) => p.id !== id))
      toast.success("Producto eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el producto")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
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
            { id: "promociones", icon: Tag, label: "Promociones" },
            { id: "productos", icon: Package, label: "Productos" },
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

      {/* Mobile Header */}
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

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-6 pb-24 lg:pb-6">
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Welcome */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
              <p className="text-primary-foreground/80">Panel de Administración</p>
              <h1 className="text-2xl font-bold mt-1">Bienvenido, {userName}</h1>
              <p className="text-primary-foreground/80 mt-2">Gestiona todo tu gimnasio desde aquí</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setShowActiveDetail(true)}
                className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/50 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    +12%
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                <p className="text-xs text-primary mt-2 font-medium">Ver detalle</p>
              </button>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    +8%
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatPrice(2340000)}</p>
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                    <Tag className="w-5 h-5 text-yellow-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">2</p>
                <p className="text-sm text-muted-foreground">Promos Activas</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">24</p>
                <p className="text-sm text-muted-foreground">Clases Esta Semana</p>
              </div>
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-foreground">Ingresos Mensuales</h2>
                <select className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground">
                  <option>Últimos 6 meses</option>
                  <option>Último año</option>
                </select>
              </div>
              <div className="h-48 flex items-end justify-between gap-2">
                {[65, 80, 70, 90, 85, 100].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Classes */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Clases Más Populares</h2>
              </div>
              <div className="divide-y divide-border">
                {topClasses.map((classItem, index) => (
                  <div key={classItem.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        index === 1 ? "bg-gray-400/20 text-gray-400" :
                        index === 2 ? "bg-orange-500/20 text-orange-500" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{classItem.name}</p>
                        <p className="text-sm text-muted-foreground">{classItem.instructor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{classItem.enrolled} inscriptos</p>
                      <p className="text-sm text-yellow-500 flex items-center gap-1 justify-end">
                        <Star className="w-3 h-3 fill-current" /> {classItem.rating}
                      </p>
                    </div>
                  </div>
                ))}
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

            {/* Plans Grid */}
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

        {activeTab === "promociones" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Promociones</h1>
              <p className="text-muted-foreground mt-1">
                Crea las promociones que quieras y se cargan automáticamente en el sistema
              </p>
            </div>

            {/* Promociones de Tienda */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Promociones de Tienda</h2>
                    <p className="text-xs text-muted-foreground">Descuentos en productos y suplementos</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreatePromoType("tienda")}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nueva Promo de Tienda
                </button>
              </div>
              {storePromos.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-card border border-border rounded-2xl p-6 text-center">
                  No hay promociones de tienda. Crea la primera.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storePromos.map((promo) => (
                    <PromoCard
                      key={promo.id}
                      promo={promo}
                      onToggle={() => togglePromotion(promo.id)}
                      onDelete={() => deletePromotion(promo.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Promociones de Planes */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Promociones de Planes</h2>
                    <p className="text-xs text-muted-foreground">Descuentos en membresías y planes</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreatePromoType("planes")}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nueva Promo de Planes
                </button>
              </div>
              {planPromos.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-card border border-border rounded-2xl p-6 text-center">
                  No hay promociones de planes. Crea la primera.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {planPromos.map((promo) => (
                    <PromoCard
                      key={promo.id}
                      promo={promo}
                      onToggle={() => togglePromotion(promo.id)}
                      onDelete={() => deletePromotion(promo.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "productos" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Productos</h1>
                <p className="text-muted-foreground mt-1">Gestiona el catálogo de la tienda</p>
              </div>
              <button
                onClick={() => setShowCreateProduct(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nuevo Producto
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
                    {productList.map((product) => (
                      <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{product.nombre}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{mapCategory(product.categoria ?? product.category ?? 1)}</td>
                        <td className="p-4 font-medium text-foreground">{formatPrice(Number(product.precio ?? 0))}</td>
                        <td className="p-4">
                          <span className={`font-medium ${Number(product.stock ?? 0) === 0 ? "text-red-500" : Number(product.stock ?? 0) < 20 ? "text-yellow-500" : "text-green-500"}`}>
                            {Number(product.stock ?? 0)} unidades
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditProduct(product)
                                setProductForm({ price: Number(product.precio ?? 0), stock: Number(product.stock ?? 0) })
                              }}
                              aria-label={`Editar ${product.nombre}`}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              aria-label={`Eliminar ${product.nombre}`}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "configuracion" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
              <p className="text-muted-foreground mt-1">Ajustes generales del sistema</p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Datos del Gimnasio</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nombre del Gimnasio</label>
                  <input
                    type="text"
                    value={gymForm.name}
                    onChange={(e) => setGymForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Dirección</label>
                  <input
                    type="text"
                    value={gymForm.address}
                    onChange={(e) => setGymForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <button onClick={saveGymConfig} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </div>

            {/* Cambio de contraseña temporal */}
            <ChangePasswordCard />

            {/* Gym Code / Support */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Soporte</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-secondary rounded-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Código del Gimnasio</p>
                    <p className="text-xl font-bold text-foreground tracking-wider mt-1">GYM-001-FL</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Este código lo genera el sistema automáticamente. Cuando necesites ayuda,
                      compártelo con el equipo de soporte para que podamos resolver tu problema.
                    </p>
                  </div>
                </div>

                {/* Contacto de Soporte */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Contacto de Soporte</p>
                  <a
                    href="tel:+5491145678900"
                    className="flex items-center gap-3 p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono / WhatsApp</p>
                      <p className="font-medium text-foreground">+54 9 11 4567-8900</p>
                    </div>
                  </a>
                  <a
                    href="mailto:soporte@fitlogic.com"
                    className="flex items-center gap-3 p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">soporte@fitlogic.com</p>
                    </div>
                  </a>
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

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Notificaciones</h2>
              </div>
              <div className="p-5 space-y-4">
                <button type="button" onClick={() => setNotificationSettings((prev) => ({ ...prev, notifNuevoPago: !prev.notifNuevoPago }))} className="w-full flex items-center justify-between cursor-pointer text-left">
                  <span className="text-foreground">Notificar vencimiento de cuota (3 días antes)</span>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${notificationSettings.notifNuevoPago ? "bg-primary" : "bg-muted"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.notifNuevoPago ? "right-1" : "left-1"}`} />
                  </div>
                </button>
                <button type="button" onClick={() => setNotificationSettings((prev) => ({ ...prev, notifAptoVencido: !prev.notifAptoVencido }))} className="w-full flex items-center justify-between cursor-pointer text-left">
                  <span className="text-foreground">Notificar vencimiento de apto físico</span>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${notificationSettings.notifAptoVencido ? "bg-primary" : "bg-muted"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.notifAptoVencido ? "right-1" : "left-1"}`} />
                  </div>
                </button>
                <button type="button" onClick={() => setNotificationSettings((prev) => ({ ...prev, notifNuevoCliente: !prev.notifNuevoCliente }))} className="w-full flex items-center justify-between cursor-pointer text-left">
                  <span className="text-foreground">Notificar nuevos pagos al administrador</span>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${notificationSettings.notifNuevoCliente ? "bg-primary" : "bg-muted"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.notifNuevoCliente ? "right-1" : "left-1"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {[
            { id: "home", icon: Home, label: "Inicio" },
            { id: "usuarios", icon: Users, label: "Usuarios" },
            { id: "promociones", icon: Tag, label: "Promos" },
            { id: "productos", icon: Package, label: "Tienda" },
            { id: "configuracion", icon: Settings, label: "Config" },
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

      {/* Modals */}
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Active Clients Detail Modal */}
      {showActiveDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Clientes Activos</h2>
              <button
                onClick={() => setShowActiveDetail(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-3xl font-bold text-foreground">156</p>
                  <p className="text-sm text-muted-foreground">Total activos</p>
                </div>
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-500">+18</p>
                  <p className="text-sm text-muted-foreground">Nuevos este mes</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <span className="text-sm text-muted-foreground">Altas último mes</span>
                  <span className="font-semibold text-green-500">+18</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <span className="text-sm text-muted-foreground">Bajas último mes</span>
                  <span className="font-semibold text-red-500">-5</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <span className="text-sm text-muted-foreground">Renovaciones</span>
                  <span className="font-semibold text-foreground">87</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <span className="text-sm text-muted-foreground">Crecimiento mensual</span>
                  <span className="font-semibold text-green-500">+12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
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

      {/* Create Promo Modal */}
      {createPromoType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Nueva Promoción</h2>
                <p className="text-xs text-primary font-medium mt-0.5">
                  {createPromoType === "tienda" ? "Promoción de Tienda" : "Promoción de Planes"}
                </p>
              </div>
              <button
                onClick={() => setCreatePromoType(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre de la Promoción</label>
                <input
                  type="text"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo((p) => ({ ...p, name: e.target.value }))}
                  placeholder={createPromoType === "tienda" ? "Combo Suplementos" : "2x1 Primer Mes"}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <textarea
                  rows={2}
                  value={newPromo.description}
                  onChange={(e) => setNewPromo((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe la promoción..."
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Descuento (%)</label>
                  <input
                    type="number"
                    value={newPromo.discount}
                    onChange={(e) => setNewPromo((p) => ({ ...p, discount: e.target.value }))}
                    placeholder="50"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Vence</label>
                  <input
                    type="date"
                    value={newPromo.validUntil}
                    onChange={(e) => setNewPromo((p) => ({ ...p, validUntil: e.target.value }))}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
              </div>
              <button
                onClick={createPromotion}
                disabled={!newPromo.name.trim()}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crear Promoción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Nuevo Producto</h2>
              <button
                onClick={() => setShowCreateProduct(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre del Producto</label>
                <input
                  type="text"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Whey Protein"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categoría</label>
                <select
                  value={newProductForm.category}
                  onChange={(e) => setNewProductForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option>Proteínas</option>
                  <option>Suplementos</option>
                  <option>Ropa</option>
                  <option>Accesorios</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Precio ($)</label>
                  <input
                    type="number"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="45000"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Stock</label>
                  <input
                    type="number"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="20"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              {/* Descripción del producto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <textarea
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describí el producto, sus beneficios y características..."
                  rows={3}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>
              {/* Imagen del producto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Imagen del Producto</label>
                {newProductImage ? (
                  <div className="relative">
                    <img
                      src={newProductImage || "/placeholder.svg"}
                      alt="Vista previa del producto"
                      className="w-full h-40 object-cover rounded-xl border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setNewProductImage(null)}
                      aria-label="Quitar imagen"
                      className="absolute top-2 right-2 p-1.5 bg-card/80 backdrop-blur-sm rounded-lg hover:bg-card transition-colors"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 w-full h-40 bg-secondary border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Upload className="w-4 h-4" /> Subir imagen
                    </span>
                    <input type="file" accept="image/*" onChange={handleProductImageChange} className="hidden" />
                  </label>
                )}
              </div>
              <button
                onClick={createProduct}
                disabled={!newProductForm.name.trim() || !newProductForm.price || !newProductForm.stock}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crear Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product / Stock Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Editar Producto</h2>
              <button
                onClick={() => setEditProduct(null)}
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
                  <p className="font-semibold text-foreground">{editProduct.name}</p>
                  <p className="text-sm text-muted-foreground">{editProduct.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Precio ($)</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Stock</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
              </div>
              <button
                onClick={saveProduct}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
