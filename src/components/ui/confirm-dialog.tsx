import { Modal } from './modal';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-secondary px-4 py-2 text-foreground hover:bg-secondary/80"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? 'bg-red-500 px-4 py-2 text-white hover:bg-red-600'
                : 'bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
            }
          >
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      }
    >
      <div />
    </Modal>
  );
}
