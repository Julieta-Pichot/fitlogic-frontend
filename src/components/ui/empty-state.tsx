import type { ReactNode } from 'react';
import { Button } from './button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          className="mt-2 bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
