import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Clock, Loader2, RotateCcw, XCircle } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { clientService } from "@/services/client.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatGymDateTime, formatIsoDate, formatMoney } from "@/utils/gym-time"
import type { PaymentReceipt, PaymentVerification } from "@/types/client"
import { ReceiptButton } from "./receipt-button"

const VIEW = {
  APROBADO: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", title: "¡Pago aprobado!", text: "Tu membresía ya está activa. ¡A entrenar!" },
  PENDIENTE: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", title: "Tu pago está pendiente de acreditación", text: "Mercado Pago todavía está procesando tu pago. Apenas se acredite, tu membresía se activa automáticamente, aunque no vuelvas a esta pantalla." },
  RECHAZADO: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", title: "El pago no se completó", text: "No se realizó ningún cobro y tu membresía no cambió. Podés intentar de nuevo." },
  REVERTIDO: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", title: "El pago fue devuelto", text: "Mercado Pago informa que este pago fue reembolsado o contracargado." },
  SIN_PAGO: { icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-secondary", title: "No encontramos un pago para esta compra todavía", text: "Si ya pagaste, esperá unos minutos y volvé a verificar. Si todavía no pagaste, podés hacerlo desde el Inicio con el botón «Pagar»." },
} satisfies Record<PaymentVerification["estado"], { icon: typeof Clock; color: string; bg: string; title: string; text: string }>

function Receipt({ receipt }: { receipt: PaymentReceipt }) {
  const method = receipt.medioPago ? `${receipt.metodoLabel} · ${receipt.medioPago}${receipt.ultimosDigitos ? ` ****${receipt.ultimosDigitos}` : ""}` : receipt.metodoLabel
  const rows: Array<[string, string]> = [
    ["Plan", receipt.plan],
    ["Monto", formatMoney(receipt.monto)],
    ["Método de pago", method],
    ["N° de operación", receipt.numeroOperacion],
    ["Fecha", formatGymDateTime(receipt.fechaPago)],
    ["Nueva vigencia", `${formatIsoDate(receipt.vigencia.desde)} al ${formatIsoDate(receipt.vigencia.hasta)}`],
  ]
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/40 text-left text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-all text-right font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Pantalla a la que vuelve Mercado Pago (o a la que se entra a mano). NUNCA se confía en el "status" de la URL:
// se le pide al backend que consulte el pago a la API de Mercado Pago y recién ahí se muestra el resultado.
export function ClientPaymentResult() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["payment-result", params.toString()],
    queryFn: async () => {
      const result = await clientService.verifyPayment({
        ...(params.get("payment_id") ? { payment_id: params.get("payment_id") as string } : {}),
        ...(params.get("collection_id") ? { collection_id: params.get("collection_id") as string } : {}),
        ...(params.get("external_reference") ? { external_reference: params.get("external_reference") as string } : {}),
      })
      // Si se aprobó, el panel (membresía, perfil, avisos) tiene que mostrar datos nuevos.
      queryClient.invalidateQueries({ queryKey: ["client"] })
      return result
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })

  const data = query.data
  const view = data ? VIEW[data.estado] : null
  const failed = data?.estado === "RECHAZADO" || data?.estado === "REVERTIDO"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 text-center">
        {query.isLoading ? (
          <div role="status" className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando tu pago con Mercado Pago...</p>
          </div>
        ) : query.isError ? (
          <div role="alert" className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">No pudimos verificar el pago</h1>
            <p className="text-sm text-red-500">{getErrorMessage(query.error, "Ocurrió un error al verificar el pago")}</p>
            <button type="button" onClick={() => query.refetch()} className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70">
              Reintentar la verificación
            </button>
          </div>
        ) : (
          view &&
          data && (
            <div className="space-y-4">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${view.bg}`}>
                <view.icon className={`h-8 w-8 ${view.color}`} />
              </div>
              <h1 className="text-xl font-bold text-foreground">{view.title}</h1>
              <p className="text-sm text-muted-foreground">{view.text}</p>

              {data.estado === "APROBADO" && data.comprobante && (
                <>
                  <Receipt receipt={data.comprobante} />
                  <ReceiptButton paymentId={data.comprobante.pagoId} className="w-full py-2.5 text-sm" />
                </>
              )}

              {/* Motivo del rechazo / detalle del estado, en lenguaje claro (viene mapeado del backend). */}
              {(failed || data.estado === "PENDIENTE" || (data.estado === "SIN_PAGO" && data.solicitudesRevisadas === 0)) && data.mensaje && (
                <p role="status" className={`rounded-xl p-3 text-sm ${failed ? "bg-red-500/10 text-red-600" : "bg-yellow-500/10 text-yellow-700"}`}>
                  {data.mensaje}
                </p>
              )}

              {data.estado === "SIN_PAGO" && data.retornoAutomatico === false && (
                <p className="rounded-xl bg-secondary p-3 text-left text-xs text-muted-foreground">
                  Este entorno no tiene configuradas las URLs públicas de retorno de Mercado Pago, por eso no volviste automáticamente. Si ya pagaste, tocá «Ya pagué, verificar mi pago» en unos segundos.
                </p>
              )}

              {failed && (
                <button
                  type="button"
                  onClick={() => navigate("/home/cliente?renovar=1", { replace: true })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <RotateCcw className="h-4 w-4" /> Reintentar el pago
                </button>
              )}
              {data.estado !== "APROBADO" && !failed && (
                <button
                  type="button"
                  onClick={() => query.refetch()}
                  disabled={query.isFetching}
                  className="w-full rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-60"
                >
                  {query.isFetching ? "Verificando..." : data.estado === "PENDIENTE" ? "Verificar nuevamente" : "Ya pagué, verificar mi pago"}
                </button>
              )}
            </div>
          )
        )}

        <button
          type="button"
          onClick={() => navigate("/home/cliente", { replace: true })}
          className={`w-full rounded-xl py-3 font-semibold transition-colors ${data?.estado === "APROBADO" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-foreground hover:bg-secondary/70"}`}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
