import { useState } from "react"
import { Search, ShoppingCart, Tag, X, Plus, Minus, Trash2, CheckCircle2, Copy, CreditCard } from "lucide-react"

const categories = [
  { id: "all", label: "Todo" },
  { id: "ropa", label: "Ropa" },
  { id: "proteinas", label: "Proteínas" },
  { id: "accesorios", label: "Accesorios" },
  { id: "suplementos", label: "Suplementos" },
  { id: "ofertas", label: "🔥 Ofertas" },
]

const products = [
  {
    id: 1,
    name: "Whey Protein Gold",
    category: "proteinas",
    price: 45000,
    originalPrice: null,
    image: "🥛",
    description: "Proteína de suero de alta calidad. 24g de proteína por porción.",
    stock: 15,
  },
  {
    id: 2,
    name: "Remera Deportiva FitLogic",
    category: "ropa",
    price: 12000,
    originalPrice: 15000,
    image: "👕",
    description: "Remera de entrenamiento con tecnología dry-fit.",
    stock: 25,
    offer: true,
  },
  {
    id: 3,
    name: "Creatina Monohidratada",
    category: "suplementos",
    price: 18000,
    originalPrice: null,
    image: "💊",
    description: "Creatina pura para mejorar rendimiento y fuerza.",
    stock: 30,
  },
  {
    id: 4,
    name: "Guantes de Entrenamiento",
    category: "accesorios",
    price: 8500,
    originalPrice: null,
    image: "🧤",
    description: "Guantes con agarre antideslizante y muñequera.",
    stock: 20,
  },
  {
    id: 5,
    name: "Botella Térmica 750ml",
    category: "accesorios",
    price: 6500,
    originalPrice: 8000,
    image: "🍶",
    description: "Botella de acero inoxidable que mantiene temperatura 24hs.",
    stock: 18,
    offer: true,
  },
  {
    id: 6,
    name: "Pre-Workout Explosive",
    category: "suplementos",
    price: 22000,
    originalPrice: null,
    image: "⚡",
    description: "Pre-entreno con cafeína y beta-alanina para máximo rendimiento.",
    stock: 12,
  },
  {
    id: 7,
    name: "Short Deportivo",
    category: "ropa",
    price: 9500,
    originalPrice: null,
    image: "🩳",
    description: "Short liviano con bolsillos laterales.",
    stock: 30,
  },
  {
    id: 8,
    name: "Barrita Proteica x12",
    category: "proteinas",
    price: 15000,
    originalPrice: 18000,
    image: "🍫",
    description: "Pack de 12 barritas con 20g de proteína cada una.",
    stock: 40,
    offer: true,
  },
]

type CartItem = { id: number; quantity: number }
type Order = {
  id: string
  items: { name: string; quantity: number; price: number }[]
  total: number
  paid: boolean
  method?: string
}

export function ClientStore() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null)
  const [modalQuantity, setModalQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"tarjeta" | "efectivo" | "transferencia">("tarjeta")
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const getProduct = (id: number) => products.find((p) => p.id === id)!

  const cartTotal = cart.reduce((sum, item) => sum + getProduct(item.id).price * item.quantity, 0)

  const addToCart = (productId: number, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId)
      if (existing) {
        return prev.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...prev, { id: productId, quantity }]
    })
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId))
  }

  const generatePurchaseId = () =>
    "CMP-" + Math.random().toString(36).slice(2, 8).toUpperCase()

  const buildOrder = (paid: boolean, method?: string): Order => ({
    id: generatePurchaseId(),
    items: cart.map((item) => {
      const product = getProduct(item.id)
      return { name: product.name, quantity: item.quantity, price: product.price }
    }),
    total: cartTotal,
    paid,
    method,
  })

  // Reserva para pagar en recepción
  const handleCheckout = () => {
    if (cart.length === 0) return
    setLastOrder(buildOrder(false))
    setCart([])
    setShowCart(false)
  }

  // Confirma el pago de los productos agregados al carrito
  const handlePayment = () => {
    if (cart.length === 0) return
    const methodLabels: Record<string, string> = {
      tarjeta: "Tarjeta",
      efectivo: "Efectivo",
      transferencia: "Transferencia",
    }
    setLastOrder(buildOrder(true, methodLabels[paymentMethod]))
    setCart([])
    setShowPayment(false)
    setShowCart(false)
    setCardNumber("")
    setCardName("")
    setCardExpiry("")
    setCardCvv("")
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "all" ||
      product.category === activeCategory ||
      (activeCategory === "ofertas" && product.offer)
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tienda</h1>
          <p className="text-muted-foreground mt-1">Productos del gimnasio</p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="relative p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0"
          aria-label="Abrir carrito"
        >
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => {
              setSelectedProduct(product)
              setModalQuantity(1)
            }}
            className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
          >
            <div className="h-28 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center text-4xl relative">
              {product.image}
              {product.offer && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  Oferta
                </span>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-foreground text-sm line-clamp-2">{product.name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No se encontraron productos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Probá con otra búsqueda o categoría
          </p>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="h-48 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center text-7xl relative">
              {selectedProduct.image}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-card/80 backdrop-blur-sm rounded-full hover:bg-card transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              {selectedProduct.offer && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full flex items-center gap-1">
                  <Tag className="w-4 h-4" /> Oferta
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedProduct.name}</h2>
                <p className="text-muted-foreground mt-2">{selectedProduct.description}</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(selectedProduct.price)}
                  </span>
                  {selectedProduct.originalPrice && (
                    <span className="ml-2 text-muted-foreground line-through">
                      {formatPrice(selectedProduct.originalPrice)}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  Stock: {selectedProduct.stock}
                </span>
              </div>

              {/* Selector de cantidad */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Cantidad</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    aria-label="Restar cantidad"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground">{modalQuantity}</span>
                  <button
                    onClick={() => setModalQuantity((q) => Math.min(selectedProduct.stock, q + 1))}
                    className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    aria-label="Sumar cantidad"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  addToCart(selectedProduct.id, modalQuantity)
                  setSelectedProduct(null)
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Mi Carrito</h2>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium">Tu carrito está vacío</p>
                  <p className="text-sm text-muted-foreground mt-1">Agregá productos desde la tienda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const product = getProduct(item.id)
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-secondary rounded-xl p-3"
                      >
                        <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                          {product.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm line-clamp-1">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-card text-foreground flex items-center justify-center hover:bg-card/70 transition-colors"
                              aria-label="Restar"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-card text-foreground flex items-center justify-center hover:bg-card/70 transition-colors"
                              aria-label="Sumar"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {formatPrice(product.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                            aria-label="Eliminar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Pagar Compra
                </button>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
                >
                  Reservar y pagar en recepción
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Pagar Compra</h2>
              </div>
              <button
                onClick={() => setShowPayment(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="Cerrar pago"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between bg-secondary rounded-xl p-4">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="text-xl font-bold text-foreground">{formatPrice(cartTotal)}</span>
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Método de pago</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "tarjeta", label: "Tarjeta" },
                    { id: "efectivo", label: "Efectivo" },
                    { id: "transferencia", label: "Transfer." },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        paymentMethod === method.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Datos de tarjeta */}
              {paymentMethod === "tarjeta" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Número de tarjeta</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nombre del titular</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Como figura en la tarjeta"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Vencimiento</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/AA"
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">CVV</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "transferencia" && (
                <p className="text-sm text-muted-foreground bg-secondary rounded-xl p-4">
                  Te enviaremos los datos bancarios para realizar la transferencia y confirmar tu compra.
                </p>
              )}
              {paymentMethod === "efectivo" && (
                <p className="text-sm text-muted-foreground bg-secondary rounded-xl p-4">
                  Abonás en efectivo al retirar tus productos en recepción.
                </p>
              )}

              <button
                onClick={handlePayment}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pagar {formatPrice(cartTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {lastOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-6 text-center border-b border-border">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {lastOrder.paid ? "¡Pago realizado!" : "¡Compra realizada!"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {lastOrder.paid
                  ? `Pagaste con ${lastOrder.method}. Acercate a recepción para retirar tus productos`
                  : "Acercate a recepción para retirar tus productos"}
              </p>
              {lastOrder.paid && (
                <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-green-500/10 text-green-500 text-sm font-medium rounded-full">
                  <CheckCircle2 className="w-4 h-4" /> Pagado
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              {/* ID de compra */}
              <div className="flex items-center justify-between bg-secondary rounded-xl p-4">
                <div>
                  <p className="text-xs text-muted-foreground">ID de compra</p>
                  <p className="font-bold text-foreground tracking-wider">{lastOrder.id}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(lastOrder.id)}
                  className="p-2 bg-card rounded-lg hover:bg-card/70 transition-colors"
                  aria-label="Copiar ID de compra"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Detalle de productos */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Detalle</h3>
                {lastOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-foreground font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground">{formatPrice(lastOrder.total)}</span>
                </div>
              </div>

              <button
                onClick={() => setLastOrder(null)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
