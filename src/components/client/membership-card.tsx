import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CreditCard, Info, Loader2, Tag } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"
import { Modal } from "@/components/ui"
import { clientService } from "@/services/client.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { expiryText, formatIsoDate, formatMoney } from "@/utils/gym-time"
import type { Membership } from "@/types/client"

// Etiqueta y color de cada estado (el estado lo calcula el backend: acá solo se muestra).
const STATUS_VIEW = {
  activa: { label: "Activa", tone: "text-green-500", dot: "bg-green-500", pulse: true },
  por_vencer: { label: "Por vencer", tone: "text-yellow-500", dot: "bg-yellow-500", pulse: true },
  vencida: { label: "Vencida", tone: "text-red-500", dot: "bg-red-500", pulse: false },
  pendiente_pago: { label: "Pago pendiente", tone: "text-yellow-500", dot: "bg-yellow-500", pulse: false },
  sin_plan: { label: "Sin plan", tone: "text-red-500", dot: "bg-red-500", pulse: false },
} as const

const plural = (days: number) => `${days} ${days === 1 ? "día" : "días"}`

// Estado de la membresía con el botón de renovar (Inicio y Perfil).
export function MembershipCard({ membership }: { membership: Membership }) {
  // ?renovar=1 abre el selector de planes (lo usa "Reintentar" de la pantalla de resultado del pago).
  const [searchParams, setSearchParams] = useSearchParams()
  const [renewing, setRenewing] = useState(searchParams.get("renovar") === "1")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { estadoMembresia, cuota, pendiente, renovacion, puedeVerificarPago, solicitudPendiente, solicitudesPendientes } = membership
  // "Pagar": el backend arma la preferencia de Mercado Pago del plan pendiente de ESTE cliente (precio desde la BD) y se redirige al checkout.
  const pay = useMutation({
    mutationFn: (planId: number) => clientService.createCheckout(planId),
    onSuccess: (result) => window.location.assign(result.initPoint),
    onError: (error) => {
      toast.error(getErrorMessage(error, "No se pudo iniciar el pago"))
      // Si el estado cambió (p. ej. recepción ya cobró), la pantalla se pone al día.
      queryClient.invalidateQueries({ queryKey: ["client"] })
    },
  })
  const closeRenew = () => {
    setRenewing(false)
    if (searchParams.has("renovar")) setSearchParams({}, { replace: true })
  }
  const view = STATUS_VIEW[estadoMembresia]
  // Con un plan pendiente (y sin membresía vigente) no hay período que mostrar: se muestra el plan elegido y cómo pagarlo.
  const pendingOnly = estadoMembresia === "pendiente_pago" && pendiente !== null
  const vigente = estadoMembresia === "activa" || estadoMembresia === "por_vencer"

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estado de membresía</p>
            <p className="font-semibold text-foreground">{pendingOnly ? pendiente.plan.nombre : cuota ? cuota.plan.nombre : "Sin membresía"}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center justify-end gap-2 ${view.tone}`}>
            <span className={`h-2 w-2 rounded-full ${view.dot} ${view.pulse ? "animate-pulse" : ""}`} />
            <span className="text-sm font-medium">{view.label}</span>
          </div>
          {cuota && !pendingOnly && <p className="mt-1 text-sm text-muted-foreground">{expiryText(cuota.diasRestantes)}</p>}
        </div>
      </div>

      {pendingOnly ? (
        <div className="mt-4 space-y-3 rounded-xl bg-yellow-500/10 p-4 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Monto a pagar</span>
            <span className="text-lg font-bold text-foreground">{formatMoney(pendiente.monto)}</span>
          </div>
          <p className="text-foreground">
            {pendiente.origen === "MERCADOPAGO"
              ? "Tu plan todavía no está pagado. Podés completar el pago en línea con Mercado Pago o acercarte a recepción a abonar."
              : "Acercate a recepción a abonar tu plan para activar tu membresía."}
          </p>
          <p className="font-medium text-yellow-600">Pendiente de pago</p>
          <p className="text-xs text-muted-foreground">
            Plan elegido el {formatIsoDate(pendiente.desde)}
            {pendiente.diasEspera > 0 ? ` · hace ${plural(pendiente.diasEspera)}` : " · hoy"}
          </p>
          {puedeVerificarPago && (
            <button type="button" onClick={() => navigate("/home/cliente/pago/resultado")} className="font-semibold text-yellow-600 underline underline-offset-2 hover:opacity-80">
              Ya pagué, verificar mi pago
            </button>
          )}
        </div>
      ) : cuota ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={cuota.progreso} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${vigente ? "bg-gradient-to-r from-primary to-primary/80" : "bg-red-500"}`} style={{ width: `${vigente ? cuota.progreso : 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Desde {formatIsoDate(cuota.fechaInicio)} · hasta {formatIsoDate(cuota.fechaVencimiento)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Todavía no tenés una membresía activa. Elegí un plan para empezar a entrenar.</p>
      )}

      {/* Solicitud pendiente MIENTRAS hay una membresía vigente o vencida (renovación sin pagar). El caso "solo pendiente" se muestra arriba. */}
      {solicitudPendiente && !pendingOnly && (
        <div className="mt-3 space-y-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Tenés {solicitudesPendientes.length > 1 ? `${solicitudesPendientes.length} solicitudes` : "una solicitud"} de pago de membresía sin confirmar
              {solicitudesPendientes.length === 1 ? ` (${solicitudesPendientes[0].plan})` : ""}.
            </span>
            {puedeVerificarPago && (
              <button type="button" onClick={() => navigate("/home/cliente/pago/resultado")} className="font-semibold underline underline-offset-2 hover:opacity-80">
                Ya pagué, verificar mi pago
              </button>
            )}
          </div>
        </div>
      )}

      {pendingOnly ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            disabled={pay.isPending}
            onClick={() => pay.mutate(pendiente.plan.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {pay.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo a Mercado Pago...
              </>
            ) : (
              <>Pagar · {formatMoney(pendiente.monto)}</>
            )}
          </button>
          <button
            type="button"
            disabled={pay.isPending}
            onClick={() => setRenewing(true)}
            className="w-full rounded-xl border border-border py-3 font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            Cambiar plan
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setRenewing(true)}
            disabled={!renovacion.permitida}
            className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
          >
            {estadoMembresia === "sin_plan" ? "Elegir plan" : "Renovar membresía"}
          </button>
          {!renovacion.permitida && renovacion.renovableDesde && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Podrás renovar a partir del {formatIsoDate(renovacion.renovableDesde)}, faltan {plural(renovacion.diasParaRenovar)}.
            </p>
          )}
        </>
      )}

      {renewing && <RenewModal onClose={closeRenew} replacing={pendingOnly} />}
    </div>
  )
}

function RenewModal({ onClose, replacing = false }: { onClose: () => void; replacing?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const plans = useQuery({ queryKey: ["client", "plans"], queryFn: clientService.listPlans, staleTime: 0 })

  // El front solo manda plan_id; el monto lo calcula el backend. Al crear el pago se redirige a Mercado Pago.
  const checkout = useMutation({
    mutationFn: (planId: number) => clientService.createCheckout(planId),
    onSuccess: (result) => {
      // El plan elegido ya reemplazó al pendiente anterior: si vuelve sin pagar, la pantalla muestra el nuevo.
      queryClient.invalidateQueries({ queryKey: ["client"] })
      window.location.assign(result.initPoint)
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["client"] }),
  })

  const plan = plans.data?.find((item) => item.id === selected)
  const config = useQuery({ queryKey: ["client", "checkout-config"], queryFn: clientService.getCheckoutConfig, staleTime: 300_000 })

  return (
    <Modal
      open
      onClose={() => !checkout.isPending && onClose()}
      title={replacing ? "Cambiar plan" : "Renovar membresía"}
      description={replacing ? "El plan que elijas reemplaza al que tenés pendiente y sigue pendiente de pago hasta que pagues. Pagá de forma segura con Mercado Pago" : "Elegí el plan y pagá de forma segura con Mercado Pago"}
      className="max-w-md"
    >
      <div className="space-y-4">
        {plans.isLoading ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando planes...
          </p>
        ) : plans.isError ? (
          <div role="alert" className="space-y-3 py-4 text-center">
            <p className="text-sm text-red-500">{getErrorMessage(plans.error, "No se pudieron cargar los planes")}</p>
            <button type="button" onClick={() => plans.refetch()} className="text-sm font-medium text-primary hover:underline">
              Reintentar
            </button>
          </div>
        ) : plans.data?.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay planes disponibles en este momento. Consultá en recepción.</p>
        ) : (
          <ul className="space-y-2" role="radiogroup" aria-label="Planes">
            {plans.data?.map((item) => {
              const checked = item.id === selected
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setSelected(item.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${checked ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{item.nombre}</p>
                        <p className="text-sm text-muted-foreground">{item.duracionDias} días de acceso</p>
                        {item.promocion && (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                            <Tag className="h-3 w-3" /> {item.promocion.nombre} · {item.promocion.descuento}% OFF
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {item.promocion && <p className="text-sm text-muted-foreground line-through">{formatMoney(item.precio)}</p>}
                        <p className="text-lg font-bold text-foreground">{formatMoney(item.precioFinal)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {checkout.isError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-500">{getErrorMessage(checkout.error, "No se pudo iniciar el pago")}</p>
          </div>
        )}

        {plan && (
          <div className="space-y-1 rounded-xl border border-border bg-secondary/50 p-3 text-sm" aria-live="polite">
            <p className="font-semibold text-foreground">Resumen de tu compra</p>
            <p className="text-foreground">
              {plan.nombre} · vigencia desde hoy ({formatIsoDate(plan.vigencia.desde)}) hasta {formatIsoDate(plan.vigencia.hasta)}
            </p>
            <p className="text-muted-foreground">
              {plan.promocion ? `${formatMoney(plan.precio)} − ${plan.promocion.descuento}% (${plan.promocion.nombre}) = ` : "Total: "}
              <span className="font-semibold text-foreground">{formatMoney(plan.precioFinal)}</span>
            </p>
            <p className="text-xs text-muted-foreground">Si todavía te quedan días de tu membresía actual, se suman al nuevo vencimiento: no los perdés.</p>
          </div>
        )}

        {plan && config.data && !config.data.retornoAutomatico && (
          <p className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Al terminar de pagar en Mercado Pago, volvé a FitLogic y tocá «Ya pagué, verificar mi pago» (en Inicio o Perfil) para activar tu membresía.</span>
          </p>
        )}

        {plan && (
          <button
            type="button"
            onClick={() => checkout.mutate(plan.id)}
            disabled={checkout.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {checkout.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo a Mercado Pago...
              </>
            ) : (
              <>Pagar con Mercado Pago · {formatMoney(plan.precioFinal)}</>
            )}
          </button>
        )}
      </div>
    </Modal>
  )
}
