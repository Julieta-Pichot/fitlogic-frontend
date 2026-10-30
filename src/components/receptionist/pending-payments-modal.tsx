import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, DollarSign, Loader2, Search } from "lucide-react"
import { Modal } from "@/components/ui"
import { recepcionService, type PendingPayment } from "@/services/recepcion.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatIsoDate, formatMoney } from "@/utils/gym-time"

interface PendingPaymentsModalProps {
  open: boolean
  onClose: () => void
  // Lleva al registro de pago de ese cliente con su cuota pendiente ya elegida.
  onRegister: (payment: PendingPayment) => void
}

const waitText = (days: number) => (days <= 0 ? "desde hoy" : `hace ${days} ${days === 1 ? "día" : "días"}`)

// Lista de clientes con pago pendiente. Los datos vienen del mismo servicio que alimenta el número de la tarjeta.
export function PendingPaymentsModal({ open, onClose, onRegister }: PendingPaymentsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Pagos pendientes" description="Clientes que eligieron un plan y todavía no pagaron" className="max-w-2xl">
      {/* Se monta recién al abrir: cada apertura consulta de nuevo y la búsqueda arranca vacía. */}
      <PendingList onRegister={onRegister} />
    </Modal>
  )
}

function PendingList({ onRegister }: { onRegister: (payment: PendingPayment) => void }) {
  const [items, setItems] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    recepcionService
      .listPendingPayments()
      .then((result) => active && (setItems(result.items), setError("")))
      .catch((err) => active && setError(getErrorMessage(err, "No se pudieron cargar los pagos pendientes")))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [attempt])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    // El sistema no guarda DNI: se busca por nombre, email o teléfono.
    return items.filter((item) => `${item.nombre} ${item.email} ${item.telefono ?? ""}`.toLowerCase().includes(term))
  }, [items, search])

  return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, email o teléfono"
            aria-label="Buscar cliente con pago pendiente"
            className="w-full rounded-xl border border-border bg-secondary py-2.5 pl-9 pr-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {loading && (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </p>
        )}

        {!loading && error && (
          <div role="alert" className="space-y-2 py-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button type="button" onClick={() => { setLoading(true); setAttempt((n) => n + 1) }} className="text-sm font-medium text-primary hover:underline">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No hay pagos pendientes" : "Ningún cliente coincide con la búsqueda"}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="divide-y divide-border">
            {filtered.map((item) => (
              <li key={item.clienteId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.plan} · <span className="font-medium text-foreground">{formatMoney(item.monto)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pendiente {waitText(item.diasEspera)} (desde el {formatIsoDate(item.pendienteDesde)})
                  </p>
                  {!item.puedeRegistrarPago && item.motivoBloqueo && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-yellow-500">
                      <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" /> {item.motivoBloqueo}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!item.puedeRegistrarPago}
                  title={item.puedeRegistrarPago ? undefined : (item.motivoBloqueo ?? undefined)}
                  onClick={() => onRegister(item)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DollarSign className="h-4 w-4" /> Registrar pago
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
  )
}
