import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calendar, Clock, Edit, MapPin, Plus, Repeat, Trash2, Users } from "lucide-react"
import toast from "react-hot-toast"
import { Badge, ConfirmDialog } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatGymDate, formatGymTime, gymDayOfWeek } from "@/utils/gym-time"
import type { TrainerClass } from "@/types/trainer"
import { ClassFormModal } from "./class-form-modal"
import { DayChips } from "./day-chips"

export function ClassesTab({ onCreate }: { onCreate: () => void }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["trainer", "classes"], queryFn: trainerService.listClasses })

  const [editing, setEditing] = useState<TrainerClass | null>(null)
  const [deleting, setDeleting] = useState<TrainerClass | null>(null)

  const remove = useMutation({
    mutationFn: (id: number) => trainerService.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer", "classes"] })
      queryClient.invalidateQueries({ queryKey: ["trainer", "profile"] })
      toast.success("Clase eliminada correctamente")
      setDeleting(null)
    },
    onError: (error) => toast.error(getErrorMessage(error, "No se pudo eliminar la clase")),
  })

  const classes = query.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Clases</h1>
          <p className="mt-1 text-muted-foreground">Administrá tus clases semanales</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Nueva clase"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Nueva clase</span>
        </button>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Cargando clases..." />
      ) : query.isError ? (
        <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(query.error, "No se pudieron cargar las clases")}</p>
          <button type="button" onClick={() => query.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Todavía no tenés clases</h3>
          <p className="max-w-sm text-sm text-muted-foreground">Creá tu primera clase y vas a recibir un aviso 15 minutos antes de cada una.</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Nueva clase
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {classes.map((clase) => {
            const percentage = Math.min(100, Math.max(0, clase.porcentajeOcupacion))
            return (
              <li key={clase.id} className="space-y-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{clase.nombre}</h3>
                      {clase.recurrente ? (
                        <Badge className="gap-1">
                          <Repeat className="h-3 w-3" /> Semanal
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{formatGymDate(clase.fechaHora)}</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {formatGymTime(clase.fechaHora)} - {clase.horaFin} hs
                      </span>
                      {clase.sala && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" /> {clase.sala}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Cupo {clase.cupoMaximo}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(clase)}
                      aria-label={`Editar ${clase.nombre}`}
                      className="rounded-lg bg-secondary p-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(clase)}
                      aria-label={`Eliminar ${clase.nombre}`}
                      className="rounded-lg bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <DayChips days={clase.recurrente ? clase.diasSemana : [gymDayOfWeek(clase.fechaHora)]} size="sm" />

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ocupación</span>
                    <span className="font-medium text-foreground">
                      {clase.inscriptos}/{clase.cupoMaximo} · {percentage}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Ocupación de ${clase.nombre}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                    className="h-2 overflow-hidden rounded-full bg-secondary"
                  >
                    <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && <ClassFormModal key={editing.id} clase={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar clase"
        description={
          deleting
            ? `Vas a eliminar «${deleting.nombre}». ${
                deleting.inscriptos > 0
                  ? `Tiene ${deleting.inscriptos} ${deleting.inscriptos === 1 ? "alumno inscripto" : "alumnos inscriptos"} y se perderán sus inscripciones. `
                  : ""
              }También se borrarán sus puntuaciones y días de repetición. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => !remove.isPending && setDeleting(null)}
      />
    </div>
  )
}
