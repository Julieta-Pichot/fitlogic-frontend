import { useEffect, useState } from "react"
import { Calendar, ChevronRight, Dumbbell, History } from "lucide-react"
import { routinesService, type RoutineRecord } from "@/services/routines.service"

const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export function ClientRoutines() {
  const [showHistory, setShowHistory] = useState(false)
  const [routines, setRoutines] = useState<RoutineRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    routinesService.listMine(showHistory).then(setRoutines).catch(() => setRoutines([])).finally(() => setLoading(false))
  }, [showHistory])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Rutinas</h1>
        <p className="text-muted-foreground mt-1">Información asignada por tu profesor</p>
      </div>

      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        <button onClick={() => setShowHistory(false)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium ${!showHistory ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Dumbbell className="w-4 h-4 inline mr-2" />Rutina Actual
        </button>
        <button onClick={() => setShowHistory(true)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium ${showHistory ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <History className="w-4 h-4 inline mr-2" />Historial
        </button>
      </div>

      {loading ? <p className="text-muted-foreground">Cargando rutinas...</p> : routines.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground">No hay rutinas cargadas.</div>
      ) : (
        <div className="space-y-4">
          {showHistory && <p className="text-sm text-muted-foreground">Mostrando rutinas del mes calendario anterior.</p>}
          {routines.map((routine) => (
            <section key={routine.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{routine.nombre}</h2>
                  <p className="text-sm text-muted-foreground">{routine.objetivo ?? routine.descripcion ?? "Sin objetivo"}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-4 h-4" />{routine.dias.map((day) => dayNames[day.diaSemana]).join(" · ")}</div>
              </div>
              <div className="divide-y divide-border">
                {routine.ejercicios.map((item, index) => (
                  <div key={`${routine.id}-${item.ejercicio.nombre}-${index}`} className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground">{index + 1}</div>
                    <div className="flex-1"><p className="font-medium text-foreground">{item.ejercicio.nombre}</p><p className="text-sm text-muted-foreground">{item.series ?? "-"} series · {item.repeticiones ?? "-"} repeticiones</p></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
