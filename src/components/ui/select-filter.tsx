interface SelectFilterOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectFilterOption[];
  label?: string;
  className?: string;
}

export function SelectFilter({ value, onChange, options, label, className }: SelectFilterProps) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
