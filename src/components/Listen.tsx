import { useEffect, useRef, useState } from 'react'
import type { AudioComparison } from '../lib/sanity'

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
type Version = 'before' | 'after'

function AudioPlayer({ comparison }: { comparison: AudioComparison | null }) {
  const before = useRef<HTMLAudioElement>(null)
  const after = useRef<HTMLAudioElement>(null)
  const active = useRef<Version>('before')
  const wanted = useRef(false)
  const request = useRef(0)
  const mounted = useRef(true)
  const [version, setVersion] = useState<Version>('before')
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [error, setError] = useState(false)
  const media = (value: Version) => value === 'before' ? before.current : after.current

  function pause() {
    wanted.current = false
    request.current++
    before.current?.pause()
    after.current?.pause()
    setPlaying(false)
  }

  function fail() { pause(); setError(true) }

  async function play(value: Version) {
    const audio = media(value)
    if (!audio) return
    const id = ++request.current
    wanted.current = true
    setPlaying(true)
    try {
      await audio.play()
      if (!mounted.current || active.current !== value || !wanted.current) audio.pause()
    } catch {
      if (mounted.current && request.current === id) fail()
    }
  }

  function metadata() {
    const durations = [before.current?.duration, after.current?.duration]
    if (durations.every(value => value !== undefined && Number.isFinite(value) && value > 0)) {
      setDuration(Math.min(...durations as number[]))
    }
  }

  function switchVersion(next: Version) {
    if (next === active.current || !duration || error) return
    const previous = media(active.current)
    const target = media(next)
    if (!target) return
    const time = Math.min(previous?.currentTime || 0, duration)
    const resume = wanted.current
    request.current++
    active.current = next
    previous?.pause()
    target.currentTime = time
    setVersion(next)
    setPosition(time)
    if (resume && time < duration) void play(next)
    else { wanted.current = false; setPlaying(false) }
  }

  function seek(time: number) {
    const value = Math.max(0, Math.min(time, duration))
    if (before.current) before.current.currentTime = value
    if (after.current) after.current.currentTime = value
    setPosition(value)
    if (value >= duration) pause()
  }

  function update(value: Version) {
    if (active.current !== value) return
    const time = media(value)?.currentTime || 0
    setPosition(Math.min(time, duration))
    if (duration && time >= duration) pause()
  }

  function retry() {
    pause()
    setError(false)
    setDuration(0)
    setPosition(0)
    before.current?.load()
    after.current?.load()
  }

  useEffect(() => {
    mounted.current = true
    const elements = [before.current, after.current]
    return () => {
      mounted.current = false
      wanted.current = false
      request.current++
      elements.forEach(audio => audio?.pause())
    }
  }, [])

  return (
    <div className="listen-player">
      <p className="home-discipline">ESCUCHA LA DIFERENCIA</p>
      <h1 id="listen-title">{comparison?.title || 'Antes. Después.'}</h1>
      <div className="audio-versions" role="group" aria-label="Versión del audio">
        <button type="button" aria-pressed={version === 'before'} disabled={!duration || error} onClick={() => switchVersion('before')}><span>A</span> Antes</button>
        <button type="button" aria-pressed={version === 'after'} disabled={!duration || error} onClick={() => switchVersion('after')}><span>B</span> Después</button>
      </div>
      <div className="audio-transport">
        <button className="audio-play" type="button" disabled={!duration || error} aria-label={playing ? 'Pausar audio' : 'Reproducir audio'} onClick={() => {
          if (wanted.current) pause()
          else { if ((media(active.current)?.currentTime || 0) >= duration) seek(0); void play(active.current) }
        }}><svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M8 5v14M16 5v14" /> : <path d="m9 5 11 7-11 7Z" />}</svg></button>
        <div className="audio-timeline">
          <label className="sr-only" htmlFor="audio-progress">Posición del audio</label>
          <input id="audio-progress" type="range" min="0" max={duration || 1} step="0.01" value={position} disabled={!duration || error} aria-valuetext={`${clock(position)} de ${clock(duration)}`} onChange={event => seek(Number(event.target.value))} />
          <div className="audio-times" aria-hidden="true"><span>{clock(position)}</span><span>{clock(duration)}</span></div>
        </div>
      </div>
      <p className="audio-hint" role="status">{error ? 'No se pudo cargar o reproducir el audio.' : !comparison ? 'Próximamente podrás escuchar la diferencia.' : !duration ? 'Cargando audio…' : 'Un mismo instante. Dos versiones.'}</p>
      {error && <button className="audio-retry" type="button" onClick={retry}>Reintentar audio</button>}
      {comparison && <>
      <audio ref={before} src={comparison.beforeUrl} preload="metadata" onLoadedMetadata={metadata} onTimeUpdate={() => update('before')} onEnded={() => { if (active.current === 'before') { setPosition(duration); pause() } }} onError={fail} />
      <audio ref={after} src={comparison.afterUrl} preload="metadata" onLoadedMetadata={metadata} onTimeUpdate={() => update('after')} onEnded={() => { if (active.current === 'after') { setPosition(duration); pause() } }} onError={fail} />
      </>}
    </div>
  )
}

export function Listen() {
  const [comparison, setComparison] = useState<AudioComparison | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    import('../lib/sanity').then(({ fetchAudioComparison }) => fetchAudioComparison(controller.signal)).then(value => {
      if (!controller.signal.aborted) { setComparison(value); setStatus('ready') }
    }).catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [attempt])
  return (
    <section className="listen-content" aria-labelledby="listen-title">
      {status === 'ready' ? <AudioPlayer comparison={comparison} /> : <div className="listen-player">
        <p className="home-discipline">ESCUCHA LA DIFERENCIA</p>
        <h1 id="listen-title">Antes. Después<span className="name-dot">.</span></h1>
        <p className="audio-hint" role="status">{status === 'loading' ? 'Cargando…' : status === 'error' ? 'No se pudo cargar la comparación.' : 'Próximamente podrás escuchar la diferencia.'}</p>
        {status === 'error' && <button className="audio-retry" type="button" onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>Reintentar</button>}
      </div>}
    </section>
  )
}
