import { useQuery } from "@tanstack/react-query"
import { Calendar, Clock, Dumbbell, Mail, MapPin, Phone, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ChangePasswordCard } from "@/components/shared/change-password-card"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { DAY_NAMES, formatGymTime, gymDayOfWeek, GYM_TIMEZONE } from "@/utils/gym-time"
import type { TrainerClass } from "@/types/trainer"

const scheduleLabel = (clase: TrainerClass) => {
  const days = clase.recurrente ? clase.diasSemana : [gymDayOfWeek(clase.fechaHora)]
  return `${days.map((day) => DAY_NAMES[day - 1].slice(0, 3)).join(" · ")} · ${formatGymTime(clase.fechaHora)} - ${clase.horaFin} hs`
}

export function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const query = useQuery({ queryKey: ["trainer", "profile"], queryFn: trainerService.getProfile })
  const profile = query.data

  const since = profile
    ? new Date(profile.fechaAlta).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: GYM_TIMEZONE })
    : null

  const rows = profile
    ? [
        { icon: Mail, label: "Email", value: profile.email },
        { icon: Phone, label: "Teléfono", value: profile.telefono || "No registrado" },
        { icon: Dumbbell, label: "Especialidad", value: profile.especialidad || "No registrada" },
        { icon: ShieldCheck, label: "Estado de la cuenta", value: profile.estadoCuenta === "HABILITADO" ? "Habilitada" : "Inhabilitada" },
        { icon: Calendar, label: "En el gimnasio desde", value: since ? since.charAt(0).toUpperCase() + since.slice(1) : "" },
      ]
    : []

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <LoadingSpinner label="Cargando perfil..." />
      ) : query.isError || !profile ? (
        <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(query.error, "No se pudo cargar el perfil")}</p>
          <button type="button" onClick={() => query.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-2xl font-bold text-primary-foreground">
                {`${profile.nombre[0] ?? ""}${profile.apellido[0] ?? ""}`.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-foreground">
                  {profile.nombre} {profile.apellido}
                </h1>
                <p className="text-muted-foreground">Profesor</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>
                    {profile.clases.length} {profile.clases.length === 1 ? "clase" : "clases"} a cargo
                  </Badge>
                  <Badge variant={profile.estadoCuenta === "HABILITADO" ? "success" : "danger"}>
                    {profile.estadoCuenta === "HABILITADO" ? "Cuenta habilitada" : "Cuenta inhabilitada"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Datos del Profesor</h2>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
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

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Clases a cargo</h2>
            </div>
            {profile.clases.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Todavía no tenés clases a cargo.</p>
            ) : (
              <ul className="divide-y divide-border">
                {profile.clases.map((clase) => (
                  <li key={clase.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{clase.nombre}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {scheduleLabel(clase)}
                        </span>
                        {clase.sala && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {clase.sala}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex flex-shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" /> {clase.inscriptos}/{clase.cupoMaximo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ChangePasswordCard minLength={8} submit={trainerService.changePassword} />

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 p-4 font-semibold text-red-500 transition-colors hover:bg-red-500/20"
      >
        Cerrar Sesión
      </button>
    </div>
  )
}
