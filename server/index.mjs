import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATTACHMENT_LIMITS, validateAttachments } from '../src/lib/attachments.ts'

const project = fileURLToPath(new URL('../', import.meta.url))
const dist = path.join(project, 'dist')
const storage = path.resolve(process.env.CONTACT_STORAGE_DIR || path.join(project, 'data', 'contact'))
const port = Number(process.env.CONTACT_PORT || 8787)
const bodyLimit = ATTACHMENT_LIMITS.maxTotalBytes + 64 * 1024
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
class RequestError extends Error { constructor(status, message) { super(message); this.status = status } }
const json = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(data))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let chunks = []
    let size = 0
    let finished = false
    const onError = error => { if (!finished) { finished = true; reject(error) } }
    request.on('data', chunk => {
      if (finished) return
      size += chunk.length
      if (size > bodyLimit) {
        finished = true
        chunks = []
        reject(new RequestError(413, 'Los adjuntos no pueden superar 50 MB en total.'))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => { if (!finished) { finished = true; resolve(Buffer.concat(chunks)) } })
    request.on('error', onError)
    request.on('aborted', () => onError(new RequestError(400, 'La carga se interrumpió. Inténtalo de nuevo.')))
  })
}

async function receiveContact(request, response) {
  const contentType = request.headers['content-type'] || ''
  if (!contentType.startsWith('multipart/form-data;')) throw new RequestError(415, 'Usa el formulario para enviar tu mensaje y adjuntos.')
  if (Number(request.headers['content-length']) > bodyLimit) {
    request.resume()
    throw new RequestError(413, 'Los adjuntos no pueden superar 50 MB en total.')
  }
  const buffer = await readBody(request)
  let form
  try {
    form = await new Request('http://localhost/api/contact', { method: 'POST', headers: { 'Content-Type': contentType }, body: buffer }).formData()
  } catch { throw new RequestError(400, 'No se pudieron leer los adjuntos. Selecciónalos de nuevo.') }
  const name = String(form.get('name') || '').trim()
  const email = String(form.get('email') || '').trim()
  const message = String(form.get('message') || '').trim()
  if (!name || name.length > 100 || !message || message.length > 5000 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestError(400, 'Revisa tu nombre, email y mensaje.')
  }
  const files = form.getAll('files')
  if (files.some(file => typeof file === 'string')) throw new RequestError(400, 'Uno de los adjuntos no es un archivo válido.')
  const validationError = validateAttachments(files)
  if (validationError) throw new RequestError(400, validationError)
  const id = randomUUID()
  const destination = path.join(storage, id)
  const attachments = []
  try {
    await mkdir(destination, { recursive: true, mode: 0o700 })
    for (const [index, file] of files.entries()) {
      const safeName = file.name.split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
      const storedName = `${String(index + 1).padStart(2, '0')}-${safeName}`
      await writeFile(path.join(destination, storedName), Buffer.from(await file.arrayBuffer()), { flag: 'wx', mode: 0o600 })
      attachments.push({ name: file.name, storedName, type: file.type, size: file.size })
    }
    await writeFile(path.join(destination, 'message.json'), JSON.stringify({ id, receivedAt: new Date().toISOString(), name, email, message, attachments }, null, 2), { flag: 'wx', mode: 0o600 })
  } catch (error) {
    await rm(destination, { recursive: true, force: true }).catch(() => {})
    throw error
  }
  json(response, 201, { id })
}

export const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); json(response, 405, { error: 'Método no permitido.' }); return }
      await receiveContact(request, response)
      return
    }
    if (url.pathname.startsWith('/api/')) { json(response, 404, { error: 'Ruta no encontrada.' }); return }
    if (!['GET', 'HEAD'].includes(request.method)) { json(response, 405, { error: 'Método no permitido.' }); return }
    let pathname
    try { pathname = decodeURIComponent(url.pathname) } catch { throw new RequestError(400, 'Ruta inválida.') }
    const filename = path.resolve(dist, `.${pathname}`)
    if (filename !== dist && !filename.startsWith(`${dist}${path.sep}`)) throw new RequestError(404, 'Archivo no encontrado.')
    let data
    let extension = path.extname(filename)
    try {
      data = await readFile(filename === dist ? path.join(dist, 'index.html') : filename)
      if (filename === dist) extension = '.html'
    } catch {
      if (extension) throw new RequestError(404, 'Archivo no encontrado.')
      data = await readFile(path.join(dist, 'index.html'))
      extension = '.html'
    }
    response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
    response.end(request.method === 'HEAD' ? undefined : data)
  } catch (error) {
    if (response.destroyed || response.headersSent) return
    if (!(error instanceof RequestError)) console.error('Contact service:', error.message)
    json(response, error instanceof RequestError ? error.status : 500, { error: error instanceof RequestError ? error.message : 'No se pudo guardar el mensaje. Inténtalo de nuevo.' })
  }
})
server.requestTimeout = 120_000
server.on('error', error => { console.error('Contact service:', error.message); process.exit(1) })
server.listen(port, '127.0.0.1', () => console.log(`Contact service: http://127.0.0.1:${server.address().port}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)))
