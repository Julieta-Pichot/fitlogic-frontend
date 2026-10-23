import { DAY_LETTERS, DAY_NAMES } from "@/utils/gym-time"

// Los 7 días con los activos resaltados (1=Lunes ... 7=Domingo).
export function DayChips({ days, size = "md" }: { days: number[]; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "h-6 w-6 text-[11px]" : "h-8 w-8 text-xs"

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`Días: ${days.map((day) => DAY_NAMES[day - 1]).join(", ")}`}>
      {DAY_LETTERS.map((letter, index) => {
        const active = days.includes(index + 1)
        return (
          <span
            key={letter + index}
            title={DAY_NAMES[index]}
            className={`${dimension} flex items-center justify-center rounded-lg font-semibold ${
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground/60"
            }`}
          >
            {letter}
          </span>
        )
      })}
    </div>
  )
}
