import { useEffect, useState } from 'react'
import { getReceipt } from '../lib/receiptStore'

export default function ReceiptThumb({ receiptId, className, alt = 'Receipt', onClick }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let active = true
    let objectUrl
    setUrl(null)
    if (receiptId) {
      getReceipt(receiptId).then((blob) => {
        if (!active || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
    }
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [receiptId])

  if (!url) return null
  return <img src={url} alt={alt} className={className} onClick={onClick} />
}
