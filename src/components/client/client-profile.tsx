import { useState, type ReactNode } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Calendar, ChevronRight, Download, FileCheck, History, Lock, LogOut, Mail, Phone, Target } from "lucide-react"
import toast from "react-hot-toast"
import { ChangePasswordCard } from "@/components/shared/change-password-card"
import { clientService } from "@/services/client.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatGymDate, formatGymTime, formatIsoDate, formatMoney } from "@/utils/gym-time"
import type { MedicalClearance } from "@/types/client"
import { EmptyBlock, QueryState } from "./client-ui"
import { MembershipCard } from "./membership-card"
import { ReceiptButton } from "./receipt-button"

type Section = "payments" | "attendance" | "password"

const APTO_UI: Record<MedicalClearance["estado"], { label: string; color: string; bg: string }> = {
  SIN_CARGAR: { label: "Sin cargar", color: "text-muted-foreground", bg: "bg-secondary" },
  VIGENTE: { label: "Vigente", color: "text-green-500", bg: "bg-green-500/10" },
  POR_VENCER: { label: "Por vencer", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  VENCIDO: { label: "Vencido", color: "text-red-500", bg: "bg-red-500/10" },
}

export function ClientProfile({ onLogout }: { userName?: string; onLogout: () => void }) {
  const [section, setSection] = useState<Section | null>(null)
  const query = useQuery({ queryKey: ["client", "profile"], queryFn: clientService.getProfile })
  const profile = query.data

  const toggle = (value: Section) => setSection((current) => (current === value ? null : value))

  return (
    <div className="space-y-6">
      <QueryState query={query} label="Cargando tu perfil..." fallback="No se pudo cargar tu perfil">
        {profile && (
          <>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-2xl font-bold text-primary-foreground">
                  {`${profile.usuario.nombre[0] ?? ""}${profile.usuario.apellido[0] ?? ""}`.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold text-foreground">
                    {profile.usuario.nombre} {profile.usuario.apellido}
                  </h1>
                  <p className="text-muted-foreground">Cliente desde {formatIsoDate(profile.cliente.fechaAlta)}</p>
                  <p className={`mt-1 text-sm font-medium ${profile.cliente.estado === "HABILITADO" ? "text-green-500" : "text-red-500"}`}>
                    {profile.cliente.estado === "HABILITADO" ? "Cuenta habilitada" : profile.cliente.estado === "INHABILITADO_PAGO" ? "Cuenta inhabilitada por falta de pago" : "Cuenta dada de baja"}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="font-semibold text-foreground">Información personal</h2>
              </div>
              <ul className="divide-y divide-border">
                {[
                  { icon: Mail, label: "Email", value: profile.usuario.email },
                  { icon: Phone, label: "Teléfono", value: profile.usuario.telefono || "No registrado" },
                  { icon: Target, label: "Objetivo de entrenamiento", value: profile.cliente.objetivoEntrenamiento || "No registrado" },
                  { icon: Calendar, label: "Objetivo de racha", value: profile.cliente.objetivoDiasRacha === null ? "Sin definir" : `${profile.cliente.objetivoDiasRacha} días por semana` },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <row.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">{row.label}</p>
                      <p className="truncate text-foreground">{row.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <MembershipCard membership={profile.membresia} />
            <MedicalClearanceCard clearance={profile.aptoFisico} />
          </>
        )}
      </QueryState>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <MenuRow icon={<History className="h-5 w-5 text-muted-foreground" />} label="Historial de pagos" open={section === "payments"} onClick={() => toggle("payments")} />
        {section === "payments" && <PaymentsHistory />}
        <MenuRow icon={<Calendar className="h-5 w-5 text-muted-foreground" />} label="Historial de asistencia" open={section === "attendance"} onClick={() => toggle("attendance")} border />
        {section === "attendance" && <AttendanceHistory />}
        <MenuRow icon={<Lock className="h-5 w-5 text-muted-foreground" />} label="Contraseña" open={section === "password"} onClick={() => toggle("password")} border />
        {section === "password" && (
          <div className="border-t border-border bg-secondary/30 p-4">
            <ChangePasswordCard submit={clientService.changePassword} />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 p-4 font-semibold text-red-500 transition-colors hover:bg-red-500/20"
      >
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>
    </div>
  )
}

function MenuRow({ icon, label, open, onClick, border = false }: { icon: ReactNode; label: string; open: boolean; onClick: () => void; border?: boolean }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={`flex w-full items-center justify-between p-4 transition-colors hover:bg-secondary/50 ${border ? "border-t border-border" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">{icon}</div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
    </button>
  )
}

function MedicalClearanceCard({ clearance }: { clearance: MedicalClearance }) {
  const ui = APTO_UI[clearance.estado]
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    setDownloading(true)
    try {
      const blob = await clientService.downloadMedicalClearance()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo abrir el apto físico"))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${ui.bg}`}>
          <FileCheck className={`h-6 w-6 ${ui.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">Apto físico</h2>
          <p className={`text-sm ${ui.color}`}>
            {ui.label}
            {clearance.fechaVencimiento && ` · Vence ${formatIsoDate(clearance.fechaVencimiento)}`}
          </p>
          {clearance.diasRestantes !== null && (
            <p className="text-xs text-muted-foreground">
              {clearance.diasRestantes >= 0 ? `Faltan ${clearance.diasRestantes} ${clearance.diasRestantes === 1 ? "día" : "días"}` : `Venció hace ${Math.abs(clearance.diasRestantes)} ${Math.abs(clearance.diasRestantes) === 1 ? "día" : "días"}`}
              {clearance.fechaCarga && ` · Cargado el ${formatIsoDate(clearance.fechaCarga)}`}
            </p>
          )}
        </div>
      </div>
      {clearance.tieneArchivo && (
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {downloading ? "Abriendo..." : "Ver mi apto físico"}
        </button>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Para actualizar tu apto físico, entregalo en recepción. El recepcionista lo carga en el sistema.</p>
    </div>
  )
}

function PaymentsHistory() {
  const query = useInfiniteQuery({
    queryKey: ["client", "payments"],
    queryFn: ({ pageParam }) => clientService.listPayments(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-3 border-t border-border bg-secondary/30 p-4">
      <QueryState query={query} label="Cargando pagos..." fallback="No se pudo cargar el historial de pagos">
        {items.length === 0 ? (
          <EmptyBlock icon={<History className="h-6 w-6" />} title="Todavía no tenés pagos registrados" />
        ) : (
          <>
            {items.map((payment) => (
              <div key={payment.id} className="flex items-start justify-between gap-3 rounded-xl bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{payment.plan}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatGymDate(payment.fechaPago)} · {payment.metodo === "MERCADO_PAGO" ? "Mercado Pago" : "Efectivo"}
                    {payment.medioPago && payment.metodo === "MERCADO_PAGO" ? ` (${payment.medioPago}${payment.ultimosDigitos ? ` ****${payment.ultimosDigitos}` : ""})` : ""}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    {formatIsoDate(payment.periodo.desde)} al {formatIsoDate(payment.periodo.hasta)}
                    {payment.referencia ? ` · Operación ${payment.referencia}` : ""}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <p className="font-semibold text-foreground">{formatMoney(payment.monto)}</p>
                  <ReceiptButton paymentId={payment.id} />
                </div>
              </div>
            ))}
            {query.hasNextPage && (
              <button type="button" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="w-full rounded-xl bg-card py-2.5 text-sm font-medium text-primary hover:bg-card/70 disabled:opacity-60">
                {query.isFetchingNextPage ? "Cargando..." : "Ver más"}
              </button>
            )}
          </>
        )}
      </QueryState>
    </div>
  )
}

function AttendanceHistory() {
  const query = useInfiniteQuery({
    queryKey: ["client", "attendance"],
    queryFn: ({ pageParam }) => clientService.listAttendances(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-2 border-t border-border bg-secondary/30 p-4">
      <QueryState query={query} label="Cargando asistencias..." fallback="No se pudo cargar el historial de asistencia">
        {items.length === 0 ? (
          <EmptyBlock icon={<Calendar className="h-6 w-6" />} title="Todavía no registraste asistencias" />
        ) : (
          <>
            {items.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl bg-card p-3">
                <span className="text-foreground">{formatGymDate(entry.fechaHora)}</span>
                <span className="text-muted-foreground">{formatGymTime(entry.fechaHora)} hs</span>
              </div>
            ))}
            {query.hasNextPage && (
              <button type="button" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="w-full rounded-xl bg-card py-2.5 text-sm font-medium text-primary hover:bg-card/70 disabled:opacity-60">
                {query.isFetchingNextPage ? "Cargando..." : "Ver más"}
              </button>
            )}
          </>
        )}
      </QueryState>
    </div>
  )
}
