import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Calendar, CalendarCheck, Clock, MapPin, Repeat, User, Users } from "lucide-react"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui"
import { clientService } from "@/services/client.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { DAY_LETTERS, DAY_NAMES, formatIsoDate } from "@/utils/gym-time"
import type { ClassListItem, MyClass } from "@/types/client"
import { CancelClassDialog, useRefreshAfterEnrollment, type CancelTarget } from "./class-actions"
import { EmptyBlock, ErrorBanner, QueryState } from "./client-ui"

type View = "dia" | "mias"

const STATUS_BADGE: Record<ClassListItem["estado"], { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  DISPONIBLE: { label: "Disponible", variant: "success" },
  COMPLETA: { label: "Completa", variant: "danger" },
  INSCRIPTO: { label: "Ya inscripto", variant: "warning" },
  YA_COMENZO: { label: "Ya comenzó", variant: "secondary" },
}

export function ClientClasses() {
  const [view, setView] = useState<View>("dia")
  const [fecha, setFecha] = useState<string | undefined>(undefined)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const refresh = useRefreshAfterEnrollment()

  const dayQuery = useQuery({ queryKey: ["client", "classes", fecha ?? "hoy"], queryFn: () => clientService.listClasses(fecha), enabled: view === "dia" })
  const mineQuery = useQuery({ queryKey: ["client", "my-classes"], queryFn: clientService.listMyClasses })

  const enroll = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) => clientService.enroll(id, date),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      toast.success("¡Inscripción confirmada!")
      refresh()
    },
    // Cupo lleno, choque de horario, cuenta inhabilitada...: se muestra el mensaje real del backend.
    onError: (error) => {
      const message = getErrorMessage(error, "No se pudo completar la inscripción")
      setActionError(message)
      refresh()
    },
  })

  const data = dayQuery.data
  const mineCount = mineQuery.data?.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clases</h1>
        <p className="mt-1 text-muted-foreground">Elegí un día e inscribite a las clases del gimnasio</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-secondary p-1" role="tablist">
        {(
          [
            ["dia", "Por día"],
            ["mias", mineCount ? `Mis clases (${mineCount})` : "Mis clases"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => {
              setView(id)
              setActionError(null)
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}

      {view === "dia" ? (
        <>
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex gap-2" role="tablist" aria-label="Días">
              {(data?.dias ?? []).map((day) => {
                const selected = day.fecha === data?.fecha
                return (
                  <button
                    key={day.fecha}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFecha(day.esHoy ? undefined : day.fecha)}
                    className={`flex min-w-[3.5rem] flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-medium">{day.esHoy ? "Hoy" : DAY_NAMES[day.diaSemana - 1].slice(0, 3)}</span>
                    <span className="text-lg font-bold leading-tight">{day.fecha.slice(8)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <QueryState query={dayQuery} label="Cargando clases..." fallback="No se pudieron cargar las clases">
            {data && data.clases.length === 0 ? (
              <EmptyBlock icon={<Calendar className="h-7 w-7" />} title="No hay clases este día" description="Probá con otro día de la semana." />
            ) : (
              <ul className="space-y-3">
                {data?.clases.map((clase) => {
                  const badge = STATUS_BADGE[clase.estado]
                  const pending = enroll.isPending && enroll.variables?.id === clase.id
                  return (
                    <li key={`${clase.id}-${clase.inicio}`} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{clase.nombre}</h3>
                            {clase.recurrente && (
                              <Badge variant="secondary" className="gap-1">
                                <Repeat className="h-3 w-3" /> Semanal
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" /> {clase.horaInicio} - {clase.horaFin} hs
                            </span>
                            {clase.sala && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" /> {clase.sala}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <User className="h-4 w-4" /> Prof. {clase.profesor}
                            </span>
                          </div>
                        </div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" /> {clase.inscriptos}/{clase.cupoMaximo} lugares
                        </span>
                        {clase.estado === "INSCRIPTO" ? (
                          <button
                            type="button"
                            disabled={!clase.puedeDarseDeBaja}
                            onClick={() => setCancelTarget({ id: clase.id, nombre: clase.nombre, recurrente: clase.recurrente })}
                            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Darme de baja
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!clase.puedeInscribirse || pending}
                            onClick={() => enroll.mutate({ id: clase.id, date: data.fecha })}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {pending ? "Inscribiendo..." : "Inscribirme"}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </QueryState>
        </>
      ) : (
        <QueryState query={mineQuery} label="Cargando tus clases..." fallback="No se pudieron cargar tus clases">
          {mineQuery.data?.length === 0 ? (
            <EmptyBlock icon={<CalendarCheck className="h-7 w-7" />} title="Todavía no estás inscripto a ninguna clase" description="Elegí un día y anotate en la que más te guste." action={
              <button type="button" onClick={() => setView("dia")} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Ver clases
              </button>
            } />
          ) : (
            <ul className="space-y-3">
              {mineQuery.data?.map((clase) => (
                <MyClassCard key={clase.id} clase={clase} onCancel={() => setCancelTarget({ id: clase.id, nombre: clase.nombre, recurrente: clase.recurrente })} />
              ))}
            </ul>
          )}
        </QueryState>
      )}

      <CancelClassDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onError={setActionError} />
    </div>
  )
}

export function MyClassCard({ clase, onCancel }: { clase: MyClass; onCancel: () => void }) {
  return (
    <li className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{clase.nombre}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {clase.horaInicio} - {clase.horaFin} hs
            </span>
            {clase.sala && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {clase.sala}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" /> Prof. {clase.profesor}
            </span>
          </div>
        </div>
        <Badge variant="warning">Inscripto</Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {clase.recurrente ? (
          DAY_LETTERS.map((letter, index) => (
            <span
              key={letter + index}
              title={DAY_NAMES[index]}
              className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-semibold ${clase.dias.includes(index + 1) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground/60"}`}
            >
              {letter}
            </span>
          ))
        ) : (
          <Badge variant="secondary">{clase.fecha ? formatIsoDate(clase.fecha) : "Clase única"}</Badge>
        )}
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={!clase.puedeDarseDeBaja}
          className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Darme de baja
        </button>
      </div>
    </li>
  )
}
