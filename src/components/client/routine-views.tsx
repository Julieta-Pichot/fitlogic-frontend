import { Calendar, Clock, Dumbbell, ExternalLink, Gauge, ListChecks, Repeat, Target, User } from "lucide-react"
import { Badge, Modal } from "@/components/ui"
import { DayChips } from "@/components/trainer/day-chips"
import { formatIsoDate } from "@/utils/gym-time"
import type { ClientRoutine } from "@/types/client"

// Tarjeta de una rutina con el botón "Ver rutina".
export function RoutineCard({ routine, onView, showStatus = false }: { routine: ClientRoutine; onView: (routine: ClientRoutine) => void; showStatus?: boolean }) {
  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{routine.nombre}</h3>
            {showStatus && <Badge variant={routine.activa ? "success" : "secondary"}>{routine.activa ? "Activa" : "Inactiva"}</Badge>}
          </div>
          {routine.objetivo && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> {routine.objetivo}
            </p>
          )}
        </div>
      </div>

      <DayChips days={routine.diasSemana} size="sm" />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> {routine.cantidadEjercicios} {routine.cantidadEjercicios === 1 ? "ejercicio" : "ejercicios"}
        </span>
        {routine.nivelDificultad && (
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> {routine.nivelDificultad}
          </span>
        )}
        {routine.frecuenciaSemanal && (
          <span className="flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5" /> {routine.frecuenciaSemanal}x por semana
          </span>
        )}
        {routine.duracionEstimada && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {routine.duracionEstimada} min
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" /> Prof. {routine.profesor}
        </p>
        <button
          type="button"
          onClick={() => onView(routine)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ver rutina
        </button>
      </div>
    </article>
  )
}

// Lista de ejercicios en orden (series x repeticiones, descanso, observaciones). Nunca muestra peso/carga.
export function ExerciseList({ routine }: { routine: ClientRoutine }) {
  return (
    <ol className="space-y-2">
      {routine.ejercicios.map((exercise) => (
        <li key={exercise.id} className="rounded-xl border border-border p-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{exercise.orden}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{exercise.nombre}</p>
              {exercise.grupoMuscular && <p className="text-xs text-muted-foreground">{exercise.grupoMuscular}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-secondary px-2 py-1 text-foreground">
                  {exercise.series ?? "–"} series × {exercise.repeticiones ?? "–"} reps
                </span>
                {exercise.descansoSegundos !== null && <span className="rounded-md bg-secondary px-2 py-1 text-foreground">Descanso {exercise.descansoSegundos}s</span>}
              </div>
              {exercise.observaciones && <p className="mt-2 text-sm text-muted-foreground">{exercise.observaciones}</p>}
              {exercise.videoUrl && (
                <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver video
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function RoutineModal({ routine, onClose }: { routine: ClientRoutine; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={routine.nombre} description={`Creada por Prof. ${routine.profesor}`} className="max-w-xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={routine.activa ? "success" : "secondary"}>{routine.activa ? "Activa" : "Inactiva"}</Badge>
          {routine.nivelDificultad && <Badge variant="secondary">{routine.nivelDificultad}</Badge>}
          {routine.duracionEstimada && <Badge variant="secondary">{routine.duracionEstimada} min</Badge>}
          {routine.frecuenciaSemanal && <Badge variant="secondary">{routine.frecuenciaSemanal}x por semana</Badge>}
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
          <ExerciseList routine={routine} />
        </div>

        {routine.descripcion && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Notas del profesor</p>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{routine.descripcion}</p>
          </div>
        )}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Asignada el {formatIsoDate(routine.fechaAsignacion)}
          <Dumbbell className="ml-2 h-3.5 w-3.5" /> Prof. {routine.profesor}
        </p>
      </div>
    </Modal>
  )
}
