import { useEffect, useState } from "react"
import { Calendar, Clock, MapPin, Users, Star, ChevronLeft, ChevronRight, X, Check } from "lucide-react"
import { classesService, type ClassRecord } from "@/services/classes.service"
import toast from "react-hot-toast"

const classes = [
  {
    id: 1,
    name: "Spinning Intensivo",
    instructor: "Carlos López",
    time: "10:00 - 11:00",
    room: "Sala B",
    spots: 5,
    maxSpots: 20,
    enrolled: true,
    isRecurring: true,
    rating: 4.8,
    finished: false,
    day: "lunes",
  },
  {
    id: 2,
    name: "Yoga Flow",
    instructor: "Ana Martínez",
    time: "18:00 - 19:00",
    room: "Sala C",
    spots: 8,
    maxSpots: 15,
    enrolled: false,
    isRecurring: true,
    rating: 4.9,
    finished: false,
    day: "lunes",
  },
  {
    id: 3,
    name: "Funcional HIIT",
    instructor: "Carlos López",
    time: "09:00 - 10:00",
    room: "Sala A",
    spots: 0,
    maxSpots: 25,
    enrolled: false,
    isRecurring: true,
    rating: 4.7,
    finished: false,
    day: "martes",
  },
  {
    id: 4,
    name: "Pilates",
    instructor: "Laura Sánchez",
    time: "17:00 - 18:00",
    room: "Sala C",
    spots: 12,
    maxSpots: 15,
    enrolled: true,
    isRecurring: true,
    rating: 4.6,
    finished: true,
    day: "miercoles",
  },
  {
    id: 5,
    name: "Masterclass Boxeo (Evento)",
    instructor: "Miguel Torres",
    time: "08:00 - 09:00",
    room: "Sala A",
    spots: 3,
    maxSpots: 20,
    enrolled: false,
    isRecurring: false,
    rating: null,
    finished: false,
    day: "jueves",
  },
  {
    id: 6,
    name: "Zumba Especial Verano",
    instructor: "Carolina Ruiz",
    time: "19:00 - 20:00",
    room: "Sala B",
    spots: 10,
    maxSpots: 30,
    enrolled: false,
    isRecurring: false,
    rating: null,
    finished: false,
    day: "viernes",
  },
]

const mapClass = (item: ClassRecord) => {
  const enrolled = item.inscripciones.some((entry) => entry.estadoInscripcion.nombre === "INSCRIPTO" || entry.estadoInscripcion.nombre === "ASISTIO")
  const finished = new Date(item.fechaHora) <= new Date()
  const enrolledCount = item.inscripciones.filter((entry) => entry.estadoInscripcion.nombre !== "CANCELADO").length
  return {
    id: item.id,
    name: item.nombre,
    instructor: `${item.profesor.usuario.nombre} ${item.profesor.usuario.apellido}`.trim(),
    time: new Date(item.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    room: item.sala ?? "Sala única",
    spots: Math.max(0, item.cupoMaximo - enrolledCount),
    maxSpots: item.cupoMaximo,
    enrolled,
    isRecurring: item.recurrente,
    rating: item.puntuaciones.length ? item.puntuaciones.reduce((sum, rating) => sum + rating.puntuacion, 0) / item.puntuaciones.length : null,
    finished,
    day: new Date(item.fechaHora).toLocaleDateString("es-AR", { weekday: "long" }).toLowerCase(),
  }
}

export function ClientClasses() {
  const [view, setView] = useState<"available" | "enrolled">("available")
  const [selectedClass, setSelectedClass] = useState<typeof classes[0] | null>(null)
  const [classList, setClassList] = useState<typeof classes>([])
  const [cancelledIds, setCancelledIds] = useState<number[]>([])
  const [ratedClasses, setRatedClasses] = useState<Record<number, number>>({})
  const [ratingClass, setRatingClass] = useState<typeof classes[0] | null>(null)
  const [ratingValue, setRatingValue] = useState(0)

  useEffect(() => {
    classesService.listAvailable().then((items) => {
      setClassList(items.map(mapClass))
      setRatedClasses(Object.fromEntries(items.flatMap((item) => item.puntuaciones.map((rating) => [item.id, rating.puntuacion]))))
    }).catch(() => toast.error("No se pudieron cargar las clases"))
  }, [])

  const myClasses = classList.filter((c) => c.enrolled)

  const enrollClass = async (id: number) => {
    try {
      await classesService.enroll(id)
      setClassList((prev) => prev.map((item) => item.id === id ? { ...item, enrolled: true, spots: Math.max(0, item.spots - 1) } : item))
      setSelectedClass(null)
      toast.success("Inscripción creada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo realizar la inscripción")
    }
  }

  const cancelEnrollment = (id: number) => {
    setCancelledIds((prev) => [...prev, id])
    setSelectedClass(null)
  }

  const submitRating = async () => {
    if (ratingClass && ratingValue > 0) {
      try {
        await classesService.rate(ratingClass.id, ratingValue)
        setRatedClasses((prev) => ({ ...prev, [ratingClass.id]: ratingValue }))
        toast.success("Puntuación guardada")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo puntuar la clase")
      }
    }
    setRatingClass(null)
    setRatingValue(0)
  }

  const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
  const dayLabels: Record<string, string> = {
    lunes: "Lun",
    martes: "Mar",
    miercoles: "Mié",
    jueves: "Jue",
    viernes: "Vie",
    sabado: "Sáb",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clases</h1>
        <p className="text-muted-foreground mt-1">Inscribite a las clases disponibles</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        <button
          onClick={() => setView("available")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            view === "available"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Disponibles
        </button>
        <button
          onClick={() => setView("enrolled")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            view === "enrolled"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mis Clases ({myClasses.length})
        </button>
      </div>

      {view === "available" ? (
        <>
          {/* Week Calendar */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <span className="font-semibold text-foreground">Marzo 2026</span>
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {days.map((day, index) => (
                <div key={day} className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">{dayLabels[day]}</p>
                  <div
                    className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium ${
                      index === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {10 + index}
                  </div>
                  {classList.filter((c) => c.day === day).length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      {classes
                        .filter((c) => c.day === day)
                        .slice(0, 3)
                        .map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Classes List */}
          <div className="space-y-3">
            {classList.map((classItem) => (
              <div
                key={classItem.id}
                      onClick={() => enrollClass(classItem.id)}
                className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{classItem.name}</h3>
                      {classItem.enrolled && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          Inscripto
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{classItem.instructor}</p>
                  </div>
                  {classItem.isRecurring && classItem.rating !== null ? (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{classItem.rating}</span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full font-medium">
                      Nueva
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {classItem.time}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {classItem.room}
                  </span>
                  <span
                    className={`text-sm flex items-center gap-1.5 ${
                      classItem.spots === 0 ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    {classItem.spots === 0
                      ? "Sin cupos"
                      : `${classItem.spots}/${classItem.maxSpots} disponibles`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* My Classes */
        <div className="space-y-3">
          {myClasses.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No estás inscripto en ninguna clase</p>
              <p className="text-sm text-muted-foreground mt-1">
                Explorá las clases disponibles e inscribite
              </p>
            </div>
          ) : (
            myClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-card border border-primary/30 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{classItem.name}</h3>
                      {classItem.finished && (
                        <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full font-medium">
                          Finalizada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{classItem.instructor}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {classItem.time}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {classItem.room}
                  </span>
                </div>

                {/* Acciones: cancelar inscripción o puntuar si ya pasó */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  {classItem.finished ? (
                    ratedClasses[classItem.id] ? (
                      <div className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl font-medium flex items-center justify-center gap-1.5 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        Puntuaste con {ratedClasses[classItem.id]}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRatingClass(classItem)
                          setRatingValue(0)
                        }}
                        className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-1.5 text-sm hover:bg-primary/90 transition-colors"
                      >
                        <Star className="w-4 h-4" />
                        Puntuar clase
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setSelectedClass(null)}
                      className="flex-1 py-2.5 bg-red-500/10 text-red-500 rounded-xl font-medium flex items-center justify-center gap-1.5 text-sm hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancelar inscripción
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Class Detail Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{selectedClass.name}</h2>
              <button
                onClick={() => setSelectedClass(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedClass.instructor}</p>
                  <p className="text-sm text-muted-foreground">Instructor</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-sm text-muted-foreground">Horario</p>
                  <p className="font-medium text-foreground">{selectedClass.time}</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-sm text-muted-foreground">Sala</p>
                  <p className="font-medium text-foreground">{selectedClass.room}</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-sm text-muted-foreground">Cupos</p>
                  <p className="font-medium text-foreground">
                    {selectedClass.spots}/{selectedClass.maxSpots}
                  </p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-sm text-muted-foreground">Puntuación</p>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    {selectedClass.rating}
                  </p>
                </div>
              </div>

              {selectedClass.enrolled ? (
                <button
                  onClick={() => cancelEnrollment(selectedClass.id)}
                  className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl font-semibold hover:bg-red-500/20 transition-colors"
                >
                  Cancelar Inscripción
                </button>
              ) : selectedClass.spots === 0 ? (
                <button className="w-full py-3 bg-secondary text-foreground rounded-xl font-semibold">
                  Anotarse en Lista de Espera
                </button>
              ) : (
                <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                  Inscribirse
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Puntuar Clase</h2>
              <button
                onClick={() => setRatingClass(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="text-center">
                <h3 className="font-semibold text-foreground">{ratingClass.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {ratingClass.instructor} • {ratingClass.time}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRatingValue(value)}
                    aria-label={`Puntuar con ${value}`}
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        value <= ratingValue ? "text-yellow-500 fill-current" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={submitRating}
                disabled={ratingValue === 0}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar puntuación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
