import { cn } from '@/utils/cn';

export function LoadingSpinner({ className, label = 'Cargando...' }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10', className)} role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return <LoadingSpinner className="min-h-[240px]" />;
}
