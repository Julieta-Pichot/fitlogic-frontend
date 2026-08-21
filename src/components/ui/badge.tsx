import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
}

const variants = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-yellow-500/10 text-yellow-600',
  danger: 'bg-red-500/10 text-red-500',
  secondary: 'bg-secondary text-muted-foreground',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'success' : 'secondary'}>{active ? 'Activo' : 'Inactivo'}</Badge>
  );
}

export function RoleBadge({ roleKey }: { roleKey: string | null }) {
  const labels: Record<string, string> = {
    admin: 'Admin',
    profesor: 'Profesor',
    recepcionista: 'Recepcionista',
    cliente: 'Cliente',
  };

  return <Badge variant="secondary">{labels[roleKey ?? ''] ?? roleKey ?? '—'}</Badge>;
}
