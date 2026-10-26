import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { ConfirmDialog } from "@/components/ui"
import { clientService } from "@/services/client.service"
import { getErrorMessage } from "@/utils/get-error-message"

// Todo lo que depende de las inscripciones se refresca después de inscribirse o darse de baja.
export const useRefreshAfterEnrollment = () => {
  const queryClient = useQueryClient()
  return () => {
    for (const key of ["classes", "my-classes", "home", "notifications"]) queryClient.invalidateQueries({ queryKey: ["client", key] })
  }
}

export interface CancelTarget {
  id: number
  nombre: string
  recurrente: boolean
}

// Confirmación de baja: en las clases recurrentes se cancela la inscripción a todos sus días.
export function CancelClassDialog({ target, onClose, onError }: { target: CancelTarget | null; onClose: () => void; onError?: (message: string) => void }) {
  const refresh = useRefreshAfterEnrollment()
  const cancel = useMutation({
    mutationFn: (id: number) => clientService.cancelEnrollment(id),
    onSuccess: () => {
      toast.success("Te diste de baja de la clase")
      refresh()
      onClose()
    },
    onError: (error) => {
      const message = getErrorMessage(error, "No se pudo cancelar la inscripción")
      onError?.(message)
      toast.error(message)
      onClose()
    },
  })

  return (
    <ConfirmDialog
      open={target !== null}
      title="Darme de baja"
      description={
        target
          ? `¿Querés cancelar tu inscripción a «${target.nombre}»? ${
              target.recurrente ? "Es una clase recurrente: se cancela tu inscripción a TODOS sus días. " : ""
            }Vas a liberar tu cupo.`
          : ""
      }
      confirmLabel="Darme de baja"
      destructive
      loading={cancel.isPending}
      onConfirm={() => target && cancel.mutate(target.id)}
      onCancel={() => !cancel.isPending && onClose()}
    />
  )
}
