import { Button } from './button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return total > 0 ? (
      <p className="text-sm text-muted-foreground">{total} resultado{total === 1 ? '' : 's'}</p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages} · {total} resultado{total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="bg-secondary px-3 py-2 text-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          Anterior
        </Button>
        <Button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="bg-secondary px-3 py-2 text-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
