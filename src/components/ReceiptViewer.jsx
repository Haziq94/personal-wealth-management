import { X } from 'lucide-react'
import ReceiptThumb from './ReceiptThumb'

export default function ReceiptViewer({ receiptId, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2" aria-label="Close">
        <X size={24} />
      </button>
      <ReceiptThumb receiptId={receiptId} className="max-w-full max-h-full object-contain" />
    </div>
  )
}
