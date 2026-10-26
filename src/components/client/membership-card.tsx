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

// Estado de la membresía con el botón de renovar (Inicio y Perfil).
export function MembershipCard({ membership }: { membership: Membership }) {
  // ?renovar=1 abre el selector de planes (lo usa "Reintentar" de la pantalla de resultado del pago).
  const [searchParams, setSearchParams] = useSearchParams()
  const [renewing, setRenewing] = useState(searchParams.get("renovar") === "1")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { estado, cuota, solicitudPendiente, solicitudesPendientes } = membership
  // Descartar una solicitud que nunca se pagó. Si Mercado Pago ya la había aprobado, el backend la activa en vez de descartarla.
  const discard = useMutation({
    mutationFn: (id: number) => clientService.discardRequest(id),
    onSuccess: (result) => {
      toast.success(result.estado === "APROBADO" ? "¡Tu pago ya estaba aprobado! Activamos tu membresía." : "Solicitud descartada")
      queryClient.invalidateQueries({ queryKey: ["client"] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "No se pudo descartar la solicitud")),
  })
  const closeRenew = () => {
    setRenewing(false)
    if (searchParams.has("renovar")) setSearchParams({}, { replace: true })
  }
  const active = estado === "ACTIVA"

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estado de membresía</p>
            <p className="font-semibold text-foreground">{cuota ? cuota.plan.nombre : "Sin membresía"}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center justify-end gap-2 ${active ? "text-green-500" : "text-red-500"}`}>
            <span className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm font-medium">{active ? "Activa" : estado === "VENCIDA" ? "Vencida" : "Sin plan"}</span>
          </div>
          {cuota && <p className="mt-1 text-sm text-muted-foreground">{expiryText(cuota.diasRestantes)}</p>}
        </div>
      </div>

      {cuota ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={cuota.progreso} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${active ? "bg-gradient-to-r from-primary to-primary/80" : "bg-red-500"}`} style={{ width: `${active ? cuota.progreso : 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Desde {formatIsoDate(cuota.fechaInicio)} · hasta {formatIsoDate(cuota.fechaVencimiento)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Todavía no tenés una membresía activa. Elegí un plan para empezar a entrenar.</p>
      )}

      {solicitudPendiente && (
        <div className="mt-3 space-y-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Tenés {solicitudesPendientes.length > 1 ? `${solicitudesPendientes.length} solicitudes` : "una solicitud"} de pago de membresía sin confirmar
              {solicitudesPendientes.length === 1 ? ` (${solicitudesPendientes[0].plan})` : ""}.
            </span>
            <button type="button" onClick={() => navigate("/home/cliente/pago/resultado")} className="font-semibold underline underline-offset-2 hover:opacity-80">
              Ya pagué, verificar mi pago
            </button>
          </div>
          <p className="text-xs text-yellow-700/80">Si no pagaste, podés descartarla:</p>
          <ul className="flex flex-wrap gap-2">
            {solicitudesPendientes.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  disabled={discard.isPending}
                  onClick={() => discard.mutate(request.id)}
                  className="rounded-md border border-yellow-600/40 px-2 py-1 text-xs font-medium hover:bg-yellow-500/10 disabled:opacity-60"
                >
                  {discard.isPending && discard.variables === request.id ? "Descartando..." : `Descartar ${request.plan}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setRenewing(true)}
        className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {estado === "SIN_MEMBRESIA" ? "Elegir plan" : "Renovar membresía"}
      </button>

      {renewing && <RenewModal onClose={closeRenew} />}
    </div>
  )
}

function RenewModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  const plans = useQuery({ queryKey: ["client", "plans"], queryFn: clientService.listPlans, staleTime: 0 })

  // El front solo manda plan_id; el monto lo calcula el backend. Al crear el pago se redirige a Mercado Pago.
  const checkout = useMutation({
    mutationFn: (planId: number) => clientService.createCheckout(planId),
    onSuccess: (result) => window.location.assign(result.initPoint),
  })

  const plan = plans.data?.find((item) => item.id === selected)
  const config = useQuery({ queryKey: ["client", "checkout-config"], queryFn: clientService.getCheckoutConfig, staleTime: 300_000 })

  return (
    <Modal open onClose={() => !checkout.isPending && onClose()} title="Renovar membresía" description="Elegí el plan y pagá de forma segura con Mercado Pago" className="max-w-md">
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
            <p className="text-xs text-muted-foreground">Tu membresía actual, si la tenés, queda reemplazada por esta desde el día del pago.</p>
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
