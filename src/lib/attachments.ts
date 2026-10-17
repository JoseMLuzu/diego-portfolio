export const ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
} as const
export const ATTACHMENT_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'opus', 'aif', 'aiff', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'zip']
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map(extension => `.${extension}`).join(',')
export type AttachmentMetadata = { name: string; size: number; lastModified?: number }

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateAttachments(files: readonly AttachmentMetadata[]): string | null {
  if (files.length > ATTACHMENT_LIMITS.maxFiles) return 'Puedes adjuntar hasta 5 archivos.'
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ATTACHMENT_EXTENSIONS.includes(extension)) return `«${file.name}»: usa audio, PDF, JPG, PNG, WebP o ZIP.`
    if (!file.size) return `«${file.name}» está vacío.`
    if (file.size > ATTACHMENT_LIMITS.maxFileBytes) return `«${file.name}» supera los 25 MB por archivo.`
  }
  if (files.reduce((total, file) => total + file.size, 0) > ATTACHMENT_LIMITS.maxTotalBytes) return 'Los adjuntos no pueden superar 50 MB en total.'
  return null
}

export function mergeAttachments<T extends AttachmentMetadata>(current: readonly T[], incoming: readonly T[]) {
  const files = [...current]
  const errors: string[] = []
  for (const file of incoming) {
    if (files.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) continue
    const error = validateAttachments([...files, file])
    if (error) errors.push(error)
    else files.push(file)
  }
  return { files, errors: [...new Set(errors)] }
}
