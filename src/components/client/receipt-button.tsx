import { useState } from "react"
import { FileText } from "lucide-react"
import toast from "react-hot-toast"
import { clientService } from "@/services/client.service"
import { getErrorMessage } from "@/utils/get-error-message"

// Abre el comprobante imprimible de un pago. Se baja con el token del cliente (no hay URL pública) y se muestra
// en otra pestaña, desde donde puede imprimirse o guardarse como PDF.
export function ReceiptButton({ paymentId, className = "" }: { paymentId: number; className?: string }) {
  const [loading, setLoading] = useState(false)

  const open = async () => {
    // La pestaña se abre en el clic (antes del await) para que el navegador no la bloquee como ventana emergente.
    const tab = window.open("", "_blank")
    setLoading(true)
    try {
      const blob = await clientService.downloadReceipt(paymentId)
      const url = URL.createObjectURL(new Blob([blob], { type: "text/html" }))
      if (tab) tab.location.href = url
      else window.location.assign(url)
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch (error) {
      tab?.close()
      toast.error(getErrorMessage(error, "No se pudo abrir el comprobante"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-60 ${className}`}
    >
      <FileText className="h-3.5 w-3.5" /> {loading ? "Abriendo..." : "Comprobante"}
    </button>
  )
}
