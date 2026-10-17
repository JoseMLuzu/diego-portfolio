import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'

let server, storage, base
before(async () => {
  storage = await mkdtemp(path.join(tmpdir(), 'diego-contact-test-'))
  server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, CONTACT_PORT: '0', CONTACT_STORAGE_DIR: storage }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Contact server did not start')), 10000)
    server.stdout.on('data', data => { output += data; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timeout); resolve(match[0]) } })
    server.on('error', reject)
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)) })
  })
})
after(async () => { if (server?.exitCode === null) { const closed = once(server, 'exit'); server.kill('SIGTERM'); await closed } if (storage) await rm(storage, { recursive: true, force: true }) })
const message = () => { const form = new FormData(); form.set('name', 'Músico de prueba'); form.set('email', 'musico@example.com'); form.set('message', 'Una propuesta con demo.'); return form }

test('multipart upload stores the message and exact attachment bytes', async () => {
  const form = message()
  const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4])
  form.append('files', new Blob([bytes], { type: 'audio/wav' }), 'demo.wav')
  form.append('files', new Blob(['Brief musical'], { type: 'application/pdf' }), 'brief.pdf')
  const response = await fetch(`${base}/api/contact`, { method: 'POST', body: form })
  assert.equal(response.status, 201)
  const { id } = await response.json()
  const record = JSON.parse(await readFile(path.join(storage, id, 'message.json'), 'utf8'))
  assert.equal(record.email, 'musico@example.com')
  assert.equal(record.attachments.length, 2)
  assert.deepEqual(new Uint8Array(await readFile(path.join(storage, id, record.attachments[0].storedName))), bytes)
  assert.equal(await readFile(path.join(storage, id, record.attachments[1].storedName), 'utf8'), 'Brief musical')
  const privateFile = await fetch(`${base}/data/contact/${id}/message.json`)
  assert.equal(privateFile.status, 404)
})
test('messages can be submitted without optional attachments', async () => {
  const response = await fetch(`${base}/api/contact`, { method: 'POST', body: message() })
  assert.equal(response.status, 201)
})
test('invalid forms and disallowed uploads are rejected without creating submissions', async () => {
  const before = await readdir(storage)
  const form = message()
  form.append('files', new Blob(['bad']), 'run.exe')
  assert.equal((await fetch(`${base}/api/contact`, { method: 'POST', body: form })).status, 400)
  const invalidEmail = message(); invalidEmail.set('email', 'not-an-email')
  assert.equal((await fetch(`${base}/api/contact`, { method: 'POST', body: invalidEmail })).status, 400)
  const tooMany = message()
  for (let i = 0; i < 6; i++) tooMany.append('files', new Blob(['track']), `demo${i}.mp3`)
  assert.equal((await fetch(`${base}/api/contact`, { method: 'POST', body: tooMany })).status, 400)
  assert.deepEqual(await readdir(storage), before)
})
test('oversized uploads are rejected on the server', async () => {
  const form = message()
  form.append('files', new Blob([new Uint8Array(25 * 1024 * 1024 + 1)]), 'large.wav')
  const response = await fetch(`${base}/api/contact`, { method: 'POST', body: form })
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /25 MB/)
})
