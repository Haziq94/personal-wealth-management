import { useState, useRef } from 'react'
import { X, Copy, Check, Upload } from 'lucide-react'

// The download-a-file route doesn't exist inside the native WebView, so backups
// there move as text: copy it out to somewhere safe, paste it back to restore.
export default function BackupModal({ mode, backup, onRestore, onClose }) {
  const [copied, setCopied] = useState(false)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState('')
  const textRef = useRef(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(backup.json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API blocked — select it so it can be copied by hand instead.
      textRef.current?.select()
      setError('Copy was blocked. The text is selected — use your keyboard or long-press to copy.')
    }
  }

  function handleRestore() {
    setError('')
    try {
      onRestore(pasted)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-paper flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b hairline">
        <h2 className="font-display text-lg">{mode === 'export' ? 'Your backup' : 'Paste a backup'}</h2>
        <button onClick={onClose} className="p-2 -m-2 text-muted" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mode === 'export' ? (
          <>
            <p className="text-xs text-muted leading-relaxed">
              Copy this and keep it somewhere safe — send it to yourself, or save it in your notes or cloud drive.
              Restoring it later brings back every transaction, account and setting.
            </p>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-emerald hover:border-emerald"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy backup'}
            </button>
            <textarea
              ref={textRef}
              readOnly
              value={backup.json}
              onFocus={(e) => e.target.select()}
              className="num w-full h-64 border hairline bg-transparent p-2 text-[11px] leading-relaxed focus:outline-none focus:border-emerald"
            />
            <p className="text-[11px] text-muted">{backup.filename}</p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted leading-relaxed">
              Paste a backup below to restore it. This replaces everything currently in the app.
            </p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste your backup here"
              className="num w-full h-64 border hairline bg-transparent p-2 text-[11px] leading-relaxed focus:outline-none focus:border-emerald"
            />
            <button
              onClick={handleRestore}
              disabled={!pasted.trim()}
              className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-emerald hover:border-emerald disabled:text-muted disabled:hover:border-current"
            >
              <Upload size={16} />
              Restore this backup
            </button>
          </>
        )}
        {error && <p className="text-xs text-rust leading-relaxed">{error}</p>}
      </div>
    </div>
  )
}
