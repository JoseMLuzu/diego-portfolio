import { spawn } from 'node:child_process'

const processes = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env }),
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const process of processes) process.kill('SIGTERM')
  // Let each child release its port before the parent exits.
  setTimeout(() => process.exit(code), 500).unref()
}
for (const process of processes) {
  process.on('error', error => { console.error(error.message); stop(1) })
  process.on('exit', code => stop(code ?? 1))
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
