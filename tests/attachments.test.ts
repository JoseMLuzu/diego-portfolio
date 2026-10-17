import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ATTACHMENT_LIMITS, mergeAttachments, validateAttachments } from '../src/lib/attachments.ts'
const file = (name: string, size = 1024) => ({ name, size, lastModified: 1 })

test('attachments allow audio, images, documents and archives with case-insensitive extensions', () => {
  for (const name of ['demo.WAV', 'idea.mp3', 'mix.flac', 'brief.pdf', 'foto.jpg', 'sesion.zip']) assert.equal(validateAttachments([file(name)]), null)
  assert.match(validateAttachments([file('programa.exe')])!, /usa audio/)
  assert.match(validateAttachments([file('vacio.wav', 0)])!, /vacío/)
})
test('attachments enforce individual, total and count limits', () => {
  const mb = 1024 * 1024
  assert.equal(validateAttachments([file('demo.wav', ATTACHMENT_LIMITS.maxFileBytes)]), null)
  assert.match(validateAttachments([file('demo.wav', ATTACHMENT_LIMITS.maxFileBytes + 1)])!, /25 MB/)
  assert.match(validateAttachments([file('a.wav', 20 * mb), file('b.wav', 20 * mb), file('c.wav', 20 * mb)])!, /50 MB/)
  assert.match(validateAttachments(Array.from({ length: 6 }, (_, i) => file(`${i}.mp3`)))!, /hasta 5/)
})
test('adding files preserves the reviewed list, ignores duplicates, and reports rejected files', () => {
  const first = file('demo.mp3')
  const result = mergeAttachments([first], [first, file('brief.pdf'), file('bad.exe')])
  assert.deepEqual(result.files.map(file => file.name), ['demo.mp3', 'brief.pdf'])
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /bad.exe/)
})
