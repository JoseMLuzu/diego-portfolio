import { ArrowIcon } from './ArrowIcon'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, DragEvent } from 'react'
import { ATTACHMENT_ACCEPT, formatFileSize, mergeAttachments } from '../lib/attachments'

export function ContactForm() {
  const [files, setFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  const dragDepth = useRef(0)
  const feedback = useRef<HTMLParagraphElement>(null)
  const id = useId()
  const busy = status === 'sending'

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (status === 'sent' || status === 'error') feedback.current?.focus() }, [status])

  function addFiles(incoming: File[]) {
    if (busy) return
    const next = mergeAttachments(files, incoming)
    setFiles(next.files)
    setFileErrors(next.errors)
    if (status === 'sent' || status === 'error') setStatus('idle')
  }
  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    addFiles(Array.from(event.dataTransfer.files))
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    // The file input is only a picker; the reviewed list is the source of truth.
    files.forEach(file => data.append('files', file, file.name))
    const controller = new AbortController()
    request.current = controller
    setStatus('sending')
    setError('')
    try {
      const response = await fetch('/api/contact', { method: 'POST', body: data, signal: controller.signal })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'No se pudo enviar el mensaje. Inténtalo de nuevo.')
      }
      // Require a receipt: a static host's HTML fallback is not a successful upload.
      const receipt = await response.json()
      if (!receipt.id) throw new Error('No se pudo confirmar el envío. Inténtalo de nuevo.')
      form.reset()
      setFiles([])
      setFileErrors([])
      setStatus('sent')
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.')
        setStatus('error')
      }
    } finally {
      request.current = null
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <legend className="sr-only">Tu mensaje y archivos adjuntos</legend>
        <div className="contact-fields">
          <label htmlFor={`${id}-name`}>Nombre<input id={`${id}-name`} name="name" autoComplete="name" enterKeyHint="next" required maxLength={100} placeholder="Tu nombre" /></label>
          <label htmlFor={`${id}-email`}>Email<input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" required maxLength={254} placeholder="tu@email.com" /></label>
        </div>
        <label className="message-label" htmlFor={`${id}-message`}>Mensaje<textarea id={`${id}-message`} name="message" required maxLength={5000} rows={3} placeholder="Cuéntame qué tienes en mente…" /></label>
        <div className="attachment-heading"><span>Archivos <span className="optional-label">(opcional)</span></span><span>{files.length}/5</span></div>
        <div
          className={`file-dropzone${dragging ? ' is-over' : ''}`}
          onDragEnter={event => { event.preventDefault(); if (event.dataTransfer.types.includes('Files')) { dragDepth.current++; setDragging(true) } }}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy' }}
          onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
          onDrop={onDrop}
        >
          <input ref={input} className="sr-only" id={`${id}-files`} type="file" multiple accept={ATTACHMENT_ACCEPT} tabIndex={-1} aria-label="Seleccionar archivos adjuntos" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
          <button type="button" className="file-picker" onClick={() => input.current?.click()} aria-describedby={`${id}-limits`}><span className="attach-icon" aria-hidden="true">＋</span><span>{dragging ? 'Suelta tus archivos aquí' : 'Añadir archivos'}<small className="file-picker-touch-hint">Desde tu dispositivo</small><small className="file-picker-drag-hint">o arrástralos aquí</small></span></button>
        </div>
        <p className="file-limits" id={`${id}-limits`}>Audio, imágenes, PDF o ZIP · 25 MB por archivo · 50 MB en total</p>
        {fileErrors.length > 0 && <ul className="form-errors" role="alert">{fileErrors.map(message => <li key={message}>{message}</li>)}</ul>}
        {files.length > 0 && <ul className="attachment-list" aria-label="Archivos adjuntos">{files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}`}><span className="attachment-name">{file.name}</span><span className="attachment-size">{formatFileSize(file.size)}</span><button type="button" aria-label={`Quitar ${file.name}`} onClick={() => { setFiles(current => current.filter((_, i) => i !== index)); setFileErrors([]) }}>×</button></li>)}</ul>}
        <div className="contact-submit"><span>{files.length > 0 ? `${files.length} ${files.length === 1 ? 'archivo adjunto' : 'archivos adjuntos'} · ${formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}` : 'Tu próximo proyecto empieza aquí.'}</span><button className="send-button" type="submit">{busy ? 'Enviando…' : 'Enviar mensaje'}<span aria-hidden="true"><ArrowIcon /></span></button></div>
      </fieldset>
      {status === 'sent' && <p className="form-feedback is-success" ref={feedback} tabIndex={-1} role="status">Mensaje recibido. Gracias por escribir.</p>}
      {status === 'error' && <p className="form-feedback is-error" ref={feedback} tabIndex={-1} role="alert">{error}</p>}
    </form>
  )
}
