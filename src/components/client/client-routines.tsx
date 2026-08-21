import { useState } from "react"
import { ChevronRight, Clock, Dumbbell, Calendar, History, Play, CheckCircle2 } from "lucide-react"

const routines = {
  lunes: [
    { id: 1, name: "Press de Banca", sets: "4x12", weight: "40kg", rest: "90s", completed: true },
    { id: 2, name: "Press Inclinado Mancuernas", sets: "3x10", weight: "16kg", rest: "90s", completed: true },
    { id: 3, name: "Aperturas en Polea", sets: "3x15", weight: "15kg", rest: "60s", completed: false },
    { id: 4, name: "Fondos en Paralelas", sets: "3x10", weight: "Corporal", rest: "90s", completed: false },
    { id: 5, name: "Press Francés", sets: "3x12", weight: "20kg", rest: "60s", completed: false },
    { id: 6, name: "Extensiones de Tríceps", sets: "3x15", weight: "12kg", rest: "60s", completed: false },
  ],
  miercoles: [
    { id: 1, name: "Sentadillas", sets: "4x10", weight: "60kg", rest: "120s", completed: false },
    { id: 2, name: "Prensa de Piernas", sets: "3x12", weight: "100kg", rest: "90s", completed: false },
    { id: 3, name: "Extensiones de Cuádriceps", sets: "3x15", weight: "35kg", rest: "60s", completed: false },
    { id: 4, name: "Curl de Piernas", sets: "3x12", weight: "30kg", rest: "60s", completed: false },
    { id: 5, name: "Peso Muerto Rumano", sets: "3x10", weight: "40kg", rest: "90s", completed: false },
  ],
  viernes: [
    { id: 1, name: "Dominadas", sets: "4x8", weight: "Corporal", rest: "120s", completed: false },
    { id: 2, name: "Remo con Barra", sets: "4x10", weight: "40kg", rest: "90s", completed: false },
    { id: 3, name: "Remo en Polea", sets: "3x12", weight: "45kg", rest: "60s", completed: false },
    { id: 4, name: "Curl con Barra", sets: "3x12", weight: "25kg", rest: "60s", completed: false },
    { id: 5, name: "Curl Martillo", sets: "3x10", weight: "12kg", rest: "60s", completed: false },
  ],
}

const history = [
  { id: 1, name: "Rutina Pecho/Tríceps", date: "10 Feb 2026", duration: "1h 15min" },
  { id: 2, name: "Rutina Pierna", date: "8 Feb 2026", duration: "1h 30min" },
  { id: 3, name: "Rutina Espalda/Bíceps", date: "6 Feb 2026", duration: "1h 10min" },
  { id: 4, name: "Rutina Full Body", date: "3 Feb 2026", duration: "1h 05min" },
]

export function ClientRoutines() {
  const [activeDay, setActiveDay] = useState<"lunes" | "miercoles" | "viernes">("lunes")
  const [showHistory, setShowHistory] = useState(false)

  const days = [
    { id: "lunes", label: "Lunes", subtitle: "Pecho/Tríceps" },
    { id: "miercoles", label: "Miércoles", subtitle: "Pierna" },
    { id: "viernes", label: "Viernes", subtitle: "Espalda/Bíceps" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Rutinas</h1>
        <p className="text-muted-foreground mt-1">Asignada por Prof. Carlos López</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        <button
          onClick={() => setShowHistory(false)}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            !showHistory
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Dumbbell className="w-4 h-4 inline mr-2" />
          Rutina Actual
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            showHistory
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4 inline mr-2" />
          Historial
        </button>
      </div>

      {!showHistory ? (
        <>
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id as typeof activeDay)}
                className={`flex-shrink-0 px-4 py-3 rounded-xl transition-all ${
                  activeDay === day.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:border-primary/50"
                }`}
              >
                <p className="font-semibold">{day.label}</p>
                <p className={`text-xs mt-0.5 ${activeDay === day.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {day.subtitle}
                </p>
              </button>
            ))}
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            {routines[activeDay].map((exercise, index) => (
              <div
                key={exercise.id}
                className="bg-card border border-border rounded-2xl p-4 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary text-muted-foreground">
                    <span className="font-semibold">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1 px-2.5 py-1 bg-secondary rounded-lg">
                        <Dumbbell className="w-3.5 h-3.5" /> {exercise.sets}
                      </span>
                      <span className="text-sm text-muted-foreground px-2.5 py-1 bg-secondary rounded-lg">
                        {exercise.weight}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* History */
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Mostrando solo el mes anterior (Febrero 2026)</p>
          </div>
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
