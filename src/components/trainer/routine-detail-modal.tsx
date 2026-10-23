import { useQuery } from "@tanstack/react-query"
import { Clock, Dumbbell, Edit, Gauge, Repeat, Target } from "lucide-react"
import { Badge, Modal } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import { formatGymDate } from "@/utils/gym-time"
import { DayChips } from "./day-chips"

interface RoutineDetailModalProps {
  routineId: number
  onClose: () => void
  onEdit: (routineId: number) => void
}

export function RoutineDetailModal({ routineId, onClose, onEdit }: RoutineDetailModalProps) {
  const query = useQuery({
    queryKey: ["trainer", "routine", routineId],
    queryFn: () => trainerService.getRoutine(routineId),
    staleTime: 0,
  })
  const routine = query.data

  return (
    <Modal
      open
      onClose={onClose}
      title={routine?.nombre ?? "Detalle de rutina"}
      description={routine ? `${routine.cliente.apellido}, ${routine.cliente.nombre}` : undefined}
      className="max-w-xl"
      footer={
        routine ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-secondary py-3 font-medium text-foreground transition-colors hover:bg-secondary/70"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => onEdit(routine.id)}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Edit className="h-4 w-4" /> Editar rutina
            </button>
          </div>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <LoadingSpinner label="Cargando rutina..." />
      ) : query.isError || !routine ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(query.error, "No se pudo cargar la rutina")}</p>
          <button type="button" onClick={() => query.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={routine.activa ? "success" : "secondary"}>{routine.activa ? "Activa" : "Inactiva"}</Badge>
            {routine.nivelDificultad && (
              <Badge variant="secondary" className="gap-1">
                <Gauge className="h-3 w-3" /> {routine.nivelDificultad}
              </Badge>
            )}
            {routine.duracionEstimada && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> {routine.duracionEstimada} min
              </Badge>
            )}
            {routine.frecuenciaSemanal && (
              <Badge variant="secondary" className="gap-1">
                <Repeat className="h-3 w-3" /> {routine.frecuenciaSemanal}x por semana
              </Badge>
            )}
          </div>

          {routine.objetivo && (
            <div className="flex items-start gap-3 rounded-xl bg-secondary p-3">
              <Target className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Objetivo</p>
                <p className="text-sm font-medium text-foreground">{routine.objetivo}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Días</p>
            <DayChips days={routine.diasSemana} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Ejercicios ({routine.ejercicios.length})</p>
            <ol className="space-y-2">
              {routine.ejercicios.map((exercise, index) => (
                <li key={exercise.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                      {exercise.ordenVisual ?? index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{exercise.nombre}</p>
                      {exercise.grupoMuscular && <p className="text-xs text-muted-foreground">{exercise.grupoMuscular}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-secondary px-2 py-1 text-foreground">
                          {exercise.series ?? "–"} series × {exercise.repeticiones ?? "–"} reps
                        </span>
                        {exercise.descansoSegundos !== null && (
                          <span className="rounded-md bg-secondary px-2 py-1 text-foreground">Descanso {exercise.descansoSegundos}s</span>
                        )}
                      </div>
                      {exercise.observaciones && <p className="mt-2 text-sm text-muted-foreground">{exercise.observaciones}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {routine.descripcion && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Notas</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{routine.descripcion}</p>
            </div>
          )}

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Dumbbell className="h-3.5 w-3.5" /> Asignada el {formatGymDate(routine.fechaAsignacion)}
          </p>
        </div>
      )}
    </Modal>
  )
}
