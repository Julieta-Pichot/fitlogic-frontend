import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Search } from "lucide-react"

export type ClientOption = {
  id: number
  label: string
  hint?: string
}

interface ClientSelectProps {
  options: ClientOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
}

// Select de clientes con búsqueda: al tipear filtra la lista, al elegir fija el cliente.
export function ClientSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccioná un cliente",
  disabled = false,
  invalid = false,
}: ClientSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const selected = options.find((option) => option.id === value) ?? null

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(term))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [open])

  const openList = () => {
    if (disabled) return
    setQuery("")
    setActiveIndex(0)
    setOpen(true)
  }

  const choose = (option: ClientOption) => {
    onChange(option.id)
    setOpen(false)
    setQuery("")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false)
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!open) openList()
      else setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter" && open) {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) choose(option)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-invalid={invalid}
        disabled={disabled}
        value={open ? query : (selected?.label ?? "")}
        placeholder={open && selected ? selected.label : placeholder}
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          if (!open) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        className={`w-full pl-11 pr-10 py-3 bg-secondary border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground disabled:opacity-60 ${
          invalid ? "border-red-500" : "border-border"
        }`}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No se encontraron clientes</li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.id}
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(option)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`cursor-pointer px-4 py-2.5 ${
                  index === activeIndex ? "bg-secondary" : ""
                } ${option.id === value ? "text-primary font-medium" : "text-foreground"}`}
              >
                <p>{option.label}</p>
                {option.hint && <p className="text-xs text-muted-foreground">{option.hint}</p>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
