import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Calendar, ChevronRight, Clock, Dumbbell, Flame, MapPin, User } from "lucide-react"
import { clientService } from "@/services/client.service"
import { DAY_LETTERS, DAY_NAMES, formatIsoDate, formatRemaining } from "@/utils/gym-time"
import { CancelClassDialog, type CancelTarget } from "./class-actions"
import { ErrorBanner, QueryState } from "./client-ui"
import { MembershipCard } from "./membership-card"
import { ExerciseList } from "./routine-views"

type Tab = "home" | "rutinas" | "clases" | "recetas" | "perfil"

export function ClientHome({ userName, setActiveTab }: { userName: string; setActiveTab: (tab: Tab) => void }) {
  // Se refresca solo (cada 30 s y al volver a la pestaña) para que la racha y la membresía reflejen lo que
  // recepción registra (asistencias, pagos) sin recargar la página.
  const query = useQuery({ queryKey: ["client", "home"], queryFn: clientService.getHome, refetchInterval: 30_000, refetchOnWindowFocus: "always", staleTime: 0 })
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const home = query.data

  return (
    <QueryState query={query} label="Cargando tu panel..." fallback="No se pudo cargar tu panel">
      {home && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
            <p className="text-sm text-primary-foreground/80">Bienvenido/a de vuelta</p>
            <h1 className="mt-1 text-2xl font-bold">{userName}</h1>
            <div className="mt-4 flex items-center gap-2">
              <Flame className="h-5 w-5" />
              <span className="font-semibold">
                {home.racha.diasAsistidos} {home.racha.diasAsistidos === 1 ? "día" : "días"}
              </span>
              <span className="text-sm text-primary-foreground/80">esta semana</span>
            </div>
          </div>

          {/* Racha semanal (solo lectura): lunes a domingo, en rojo los días con asistencia */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <Flame className="h-5 w-5 text-primary" /> Tu racha semanal
            </h2>
            <div className="flex justify-between gap-2">
              {home.racha.dias.map((day) => (
                <div
                  key={day.fecha}
                  title={`${DAY_NAMES[day.diaSemana - 1]} ${formatIsoDate(day.fecha)}${day.asistio ? " · asististe" : ""}`}
                  aria-label={`${DAY_NAMES[day.diaSemana - 1]}: ${day.asistio ? "asististe" : day.futuro ? "pendiente" : "sin asistencia"}`}
                  className={`flex aspect-square flex-1 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    day.asistio ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground"
                  } ${day.futuro ? "opacity-50" : ""} ${day.esHoy ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-card" : ""}`}
                >
                  {DAY_LETTERS[day.diaSemana - 1]}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {home.racha.objetivoDias === null
                ? "Sin objetivo definido"
                : `${home.racha.diasAsistidos} de ${home.racha.objetivoDias} días${home.racha.diasAsistidos >= home.racha.objetivoDias ? " · ¡objetivo cumplido!" : ""}`}
            </p>
            {home.racha.diasAsistidos === 0 && (
              <p className="mt-1 text-center text-xs text-muted-foreground">Aún no asististe esta semana. Cada día que vayas al gimnasio se marca en rojo.</p>
            )}
          </div>

          <MembershipCard membership={home.membresia} />

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["rutinas", Dumbbell, "Mi rutina", "Ver ejercicios de hoy"],
                ["clases", Calendar, "Clases", "Inscribite y mirá tus clases"],
              ] as const
            ).map(([tab, Icon, title, subtitle]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              </button>
            ))}
          </div>

          {/* Rutina de hoy */}
          {home.rutinasHoy.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Rutina de hoy</h2>
              <p className="mt-2 text-sm text-muted-foreground">No hay rutina para hoy.</p>
            </div>
          ) : (
            home.rutinasHoy.map((routine) => (
              <div key={routine.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-foreground">Rutina de hoy · {routine.nombre}</h2>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" /> Prof. {routine.profesor}
                      {routine.objetivo ? ` · ${routine.objetivo}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => setActiveTab("rutinas")} className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-primary">
                    Ver todo <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <ExerciseList routine={routine} />
                </div>
              </div>
            ))
          )}

          {/* Próxima clase */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground">Próxima clase</h2>
            {actionError && (
              <div className="mb-3">
                <ErrorBanner message={actionError} onClose={() => setActionError(null)} />
              </div>
            )}
            {home.proximaClase ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10">
                    <span className="text-xl font-bold text-primary">{home.proximaClase.horaInicio}</span>
                    <span className="text-[10px] text-primary">{home.proximaClase.minutosRestantes !== null ? formatRemaining(home.proximaClase.minutosRestantes) : ""}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{home.proximaClase.nombre}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {home.proximaClase.horaInicio} - {home.proximaClase.horaFin}
                      </span>
                      {home.proximaClase.sala && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {home.proximaClase.sala}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Prof. {home.proximaClase.profesor}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!home.proximaClase.puedeDarseDeBaja}
                  onClick={() => home.proximaClase && setCancelTarget({ id: home.proximaClase.id, nombre: home.proximaClase.nombre, recurrente: home.proximaClase.recurrente })}
                  className="w-full rounded-xl bg-red-500/10 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Darme de baja
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">No tenés clases próximas.</p>
                <button type="button" onClick={() => setActiveTab("clases")} className="text-sm font-medium text-primary hover:underline">
                  Ver clases disponibles
                </button>
              </div>
            )}
          </div>

          <CancelClassDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onError={setActionError} />
        </div>
      )}
    </QueryState>
  )
}
