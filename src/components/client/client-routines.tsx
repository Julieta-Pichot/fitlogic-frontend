import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Dumbbell, History } from "lucide-react"
import { Badge } from "@/components/ui"
import { clientService } from "@/services/client.service"
import { formatIsoDate } from "@/utils/gym-time"
import type { ClientRoutine } from "@/types/client"
import { EmptyBlock, QueryState } from "./client-ui"
import { RoutineCard, RoutineModal } from "./routine-views"

export function ClientRoutines() {
  const [showHistory, setShowHistory] = useState(false)
  const [viewing, setViewing] = useState<ClientRoutine | null>(null)

  const active = useQuery({ queryKey: ["client", "routines"], queryFn: clientService.listRoutines, enabled: !showHistory })
  const history = useQuery({ queryKey: ["client", "routines", "history"], queryFn: clientService.listRoutineHistory, enabled: showHistory })
  const query = showHistory ? history : active
  const routines = query.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Rutinas</h1>
        <p className="mt-1 text-muted-foreground">Información asignada por tus profesores</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-secondary p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!showHistory}
          onClick={() => setShowHistory(false)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${!showHistory ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <Dumbbell className="h-4 w-4" /> Mis rutinas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={showHistory}
          onClick={() => setShowHistory(true)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${showHistory ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <History className="h-4 w-4" /> Historial
        </button>
      </div>

      <QueryState query={query} label="Cargando rutinas..." fallback="No se pudieron cargar las rutinas">
        {routines.length === 0 ? (
          <EmptyBlock
            icon={showHistory ? <History className="h-7 w-7" /> : <Dumbbell className="h-7 w-7" />}
            title={showHistory ? "Sin rutinas en los últimos 30 días" : "No tenés rutinas activas"}
            description={showHistory ? "Acá vas a ver las rutinas que te asignaron durante el último mes." : "Cuando un profesor te asigne una rutina, la vas a ver acá."}
          />
        ) : (
          <div className="space-y-4">
            {showHistory && <p className="text-sm text-muted-foreground">Rutinas asignadas en los últimos 30 días, de la más reciente a la más antigua.</p>}
            <ul className="space-y-3">
              {routines.map((routine) => (
                <li key={routine.id} className="space-y-1">
                  {showHistory && (
                    <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                      Asignada el {formatIsoDate(routine.fechaAsignacion)} · <Badge variant={routine.activa ? "success" : "secondary"}>{routine.activa ? "Activa" : "Inactiva"}</Badge>
                    </p>
                  )}
                  <RoutineCard routine={routine} onView={setViewing} showStatus={!showHistory} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </QueryState>

      {viewing && <RoutineModal routine={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
