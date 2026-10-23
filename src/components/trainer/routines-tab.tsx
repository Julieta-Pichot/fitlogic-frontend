import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList, Clock, Dumbbell, Edit, Eye, Gauge, ListChecks, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { trainerService } from "@/services/trainer.service"
import { getErrorMessage } from "@/utils/get-error-message"
import type { RoutineGroup } from "@/types/trainer"
import { DayChips } from "./day-chips"
import { RoutineDetailModal } from "./routine-detail-modal"
import { RoutineFormModal } from "./routine-form-modal"

type StatusFilter = "all" | "active" | "inactive"

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "inactive", label: "Inactivas" },
]

const stripAccents = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function RoutinesTab({ onCreate }: { onCreate: () => void }) {
  const query = useQuery({ queryKey: ["trainer", "routines"], queryFn: trainerService.listRoutines })

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const groups = useMemo<RoutineGroup[]>(() => {
    const term = stripAccents(search.trim())
    return (query.data ?? [])
      .map((group) => {
        const clientMatches = stripAccents(`${group.cliente.apellido} ${group.cliente.nombre}`).includes(term)
        const routines = group.rutinas.filter((routine) => {
          if (status === "active" && !routine.activa) return false
          if (status === "inactive" && routine.activa) return false
          return !term || clientMatches || stripAccents(routine.nombre).includes(term)
        })
        return { ...group, rutinas: routines }
      })
      .filter((group) => group.rutinas.length > 0)
  }, [query.data, search, status])

  const totalRoutines = (query.data ?? []).reduce((sum, group) => sum + group.rutinas.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rutinas</h1>
          <p className="mt-1 text-muted-foreground">Las rutinas que armaste para tus alumnos</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Crear rutina"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Nueva rutina</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por alumno o rutina..."
            className="w-full rounded-xl border border-border bg-secondary py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div role="group" aria-label="Filtrar por estado" className="flex rounded-xl bg-secondary p-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={status === filter.id}
              onClick={() => setStatus(filter.id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
                status === filter.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Cargando rutinas..." />
      ) : query.isError ? (
        <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-500">{getErrorMessage(query.error, "No se pudieron cargar las rutinas")}</p>
          <button type="button" onClick={() => query.refetch()} className="text-sm font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {totalRoutines === 0 ? "Todavía no creaste rutinas" : "No hay rutinas que coincidan"}
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {totalRoutines === 0
              ? "Armá la primera rutina de un alumno y la vas a ver acá, agrupada por cliente."
              : "Probá con otro nombre o cambiá el filtro de estado."}
          </p>
          {totalRoutines === 0 && (
            <button
              type="button"
              onClick={onCreate}
              className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Crear rutina
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.cliente.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-center gap-3 border-b border-border p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary font-semibold text-foreground">
                  {`${group.cliente.nombre[0] ?? ""}${group.cliente.apellido[0] ?? ""}`.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-foreground">
                    {group.cliente.apellido}, {group.cliente.nombre}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.rutinas.length} {group.rutinas.length === 1 ? "rutina" : "rutinas"}
                  </p>
                </div>
                {group.cliente.estado !== "HABILITADO" && (
                  <Badge variant="warning">{group.cliente.estado.replace(/_/g, " ").toLowerCase()}</Badge>
                )}
              </header>

              <ul className="divide-y divide-border">
                {group.rutinas.map((routine) => (
                  <li key={routine.id} className="space-y-3 p-4 transition-colors hover:bg-secondary/30">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{routine.nombre}</h3>
                          <Badge variant={routine.activa ? "success" : "secondary"}>{routine.activa ? "Activa" : "Inactiva"}</Badge>
                        </div>
                        {routine.objetivo && <p className="mt-0.5 text-sm text-muted-foreground">{routine.objetivo}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingId(routine.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Eye className="h-4 w-4" /> Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(routine.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Edit className="h-4 w-4" /> Editar
                        </button>
                      </div>
                    </div>

                    <DayChips days={routine.diasSemana} size="sm" />

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" /> {routine.cantidadEjercicios}{" "}
                        {routine.cantidadEjercicios === 1 ? "ejercicio" : "ejercicios"}
                      </span>
                      {routine.nivelDificultad && (
                        <span className="flex items-center gap-1.5">
                          <Gauge className="h-3.5 w-3.5" /> {routine.nivelDificultad}
                        </span>
                      )}
                      {routine.frecuenciaSemanal && (
                        <span className="flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5" /> {routine.frecuenciaSemanal}x por semana
                        </span>
                      )}
                      {routine.duracionEstimada && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> {routine.duracionEstimada} min
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {viewingId !== null && (
        <RoutineDetailModal
          routineId={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={(id) => {
            setViewingId(null)
            setEditingId(id)
          }}
        />
      )}
      {editingId !== null && <RoutineFormModal key={editingId} routineId={editingId} onClose={() => setEditingId(null)} />}
    </div>
  )
}
