import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Calendar, ChevronRight, Clock, MapPin, Plus, UtensilsCrossed } from "lucide-react"
import { trainerService } from "@/services/trainer.service"
import { formatGymTime, occursOnGymDay } from "@/utils/gym-time"

interface HomeTabProps {
  userName: string
  onCreateRoutine: () => void
  onCreateClass: () => void
  onCreateRecipe: () => void
  onSeeClasses: () => void
}

export function HomeTab({ userName, onCreateRoutine, onCreateClass, onCreateRecipe, onSeeClasses }: HomeTabProps) {
  const classesQuery = useQuery({ queryKey: ["trainer", "classes"], queryFn: trainerService.listClasses })
  const classes = classesQuery.data

  // Clases que ocurren hoy (hora del gimnasio), ordenadas por horario.
  const todayClasses = useMemo(
    () =>
      (classes ?? [])
        .filter((clase) => occursOnGymDay(clase))
        .sort((a, b) => formatGymTime(a.fechaHora).localeCompare(formatGymTime(b.fechaHora))),
    [classes]
  )

  const actions = [
    { label: "Crear rutina", icon: Plus, onClick: onCreateRoutine },
    { label: "Nueva clase", icon: Calendar, onClick: onCreateClass },
    { label: "Nueva receta", icon: UtensilsCrossed, onClick: onCreateRecipe },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <p className="text-sm text-primary-foreground/80">Bienvenido, Profesor</p>
        <h1 className="mt-1 text-2xl font-bold">{userName}</h1>
        <div className="mt-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span className="font-semibold">
            {classes ? `${classes.length} ${classes.length === 1 ? "clase" : "clases"} a cargo` : "Cargando clases..."}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-2xl border border-border bg-card p-4 text-center transition-all hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <action.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{action.label}</p>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Clases de hoy</h2>
          <button type="button" onClick={onSeeClasses} className="flex items-center gap-1 text-sm font-medium text-primary">
            Ver todas <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {classesQuery.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Cargando clases...</p>
        ) : classesQuery.isError ? (
          <p className="p-6 text-center text-sm text-red-500">
            No se pudieron cargar las clases.{" "}
            <button type="button" onClick={() => classesQuery.refetch()} className="font-medium underline">
              Reintentar
            </button>
          </p>
        ) : todayClasses.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No tenés clases programadas para hoy.</p>
        ) : (
          <ul className="divide-y divide-border">
            {todayClasses.map((clase) => (
              <li key={clase.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">{clase.nombre}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {formatGymTime(clase.fechaHora)} - {clase.horaFin} hs
                    </span>
                    {clase.sala && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {clase.sala}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">
                    {clase.inscriptos}/{clase.cupoMaximo}
                  </span>
                  <p className="text-xs text-muted-foreground">inscriptos</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
