import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { CAROUSEL_DEFAULTS, SCROLL_STORY_DEFAULTS, clamp, gestureTarget, imageGeometry } from './carouselMath'
import type { CarouselConfig } from './carouselMath'
import { HomeSocials } from './HomeSocials'
import type { Release } from '../data/releases'

export interface CarouselHandle {
  scrollToScene: (scene: number, behavior?: ScrollBehavior) => void
}
interface Props {
  images: Release[]
  config?: Partial<CarouselConfig>
  onSceneChange?: (scene: number) => void
}

function CarouselImage({ image, index, position, width, config, active, select }: {
  image: Release; index: number; position: MotionValue<number>; width: MotionValue<number>
  config: CarouselConfig; active: boolean; select: (index: number) => void
}) {
  const geometry = useTransform(() => imageGeometry(index + 1 - position.get(), width.get(), config))
  const y = useTransform(geometry, value => value.y)
  const scale = useTransform(geometry, value => value.scale)
  const zIndex = useTransform(geometry, value => value.zIndex)
  const hitWidth = useTransform(() => Math.max(44, width.get() * geometry.get().scale))
  const hitHeight = useTransform(() => Math.max(44, width.get() / config.aspectRatio * geometry.get().scale))
  const imageHeight = useTransform(width, value => value / config.aspectRatio)
  return (
    <motion.button className="carousel-image" style={{ y, zIndex, width: hitWidth, height: hitHeight }} tabIndex={-1} aria-label={`Ver ${image.title}`} aria-current={active ? 'true' : undefined} onClick={() => select(index + 1)} data-image-index={index}>
      <motion.img style={{ width, height: imageHeight, scale }} src={image.src} alt={image.alt} draggable={false} fetchPriority={index === 0 ? 'high' : 'auto'} />
    </motion.button>
  )
}

export const VerticalCarousel = forwardRef<CarouselHandle, Props>(function VerticalCarousel({ images, config: overrides, onSceneChange }, ref) {
  const lastScene = images.length
  const config = useMemo(() => ({ ...CAROUSEL_DEFAULTS, ...overrides }), [overrides])
  const track = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const carousel = useRef<HTMLDivElement>(null)
  const controls = useRef<ReturnType<typeof animate> | null>(null)
  const goToRef = useRef<(scene: number, behavior?: ScrollBehavior) => void>(() => {})
  const relativeRef = useRef<(direction: number) => void>(() => {})
  const onSceneChangeRef = useRef(onSceneChange)
  onSceneChangeRef.current = onSceneChange
  const frameHeight = useMotionValue(760)
  const imageWidth = useMotionValue(config.mainWidth)
  const step = useMotionValue<number>(SCROLL_STORY_DEFAULTS.maxStep)
  const start = useMotionValue(0)
  const { scrollY } = useScroll()
  const position = useTransform(() => clamp((scrollY.get() - start.get()) / step.get(), 0, lastScene))
  const reducedMotion = useReducedMotion()
  const visualPosition = useTransform(position, value => reducedMotion ? Math.round(value) : value)
  const trackHeight = useTransform(() => frameHeight.get() + step.get() * lastScene)
  const [scene, setScene] = useState(0)
  const [dragging, setDragging] = useState(false)
  const sceneRef = useRef(0)
  const helpId = useId()
  const isHome = scene === 0
  const isProject = !isHome
  const projectNumber = clamp(scene, 1, images.length)
  const release = images[projectNumber - 1]

  useMotionValueEvent(position, 'change', value => {
    const next = clamp(Math.round(value), 0, lastScene)
    if (sceneRef.current !== next) {
      sceneRef.current = next
      setScene(next)
      onSceneChangeRef.current?.(next)
    }
  })

  const homeY = useTransform(() => {
    const value = visualPosition.get()
    return imageGeometry(-value, imageWidth.get(), config).y - Math.min(value, 1) * (frameHeight.get() - (carousel.current?.clientHeight ?? frameHeight.get())) / 2
  })
  const homeScale = useTransform(visualPosition, value => 0.14 + 0.86 * Math.exp(-config.falloff * value * value))
  const homeOpacity = useTransform(visualPosition, [0, 1.4, 2.4], [1, 1, 0])
  const homeDetailOpacity = useTransform(visualPosition, [0, 0.32, 0.55], [1, 0.2, 0])
  const homePointerEvents = useTransform(position, value => value < 0.5 ? 'auto' as const : 'none' as const)
  const galleryOpacity = useTransform(visualPosition, [0, 0.12, 0.75, 1], [0, 0, 0.9, 1])
  const galleryPointerEvents = useTransform(position, value => value >= 0.5 ? 'auto' as const : 'none' as const)
  const galleryZ = useTransform(position, value => value >= 0.5 ? 1100 : 800)
  const captionOpacity = useTransform(visualPosition, [0.35, 0.85], [0, 1])

  useImperativeHandle(ref, () => ({ scrollToScene: (index, behavior = 'smooth') => goToRef.current(index, behavior) }), [])

  useEffect(() => {
    const element = stage.current
    const trackElement = track.current
    const cards = carousel.current
    if (!element || !trackElement || !cards) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let clickTimer: ReturnType<typeof setTimeout> | undefined
    let resizeFrame = 0
    let programmatic = false
    let touching = false
    let suppressClick = false
    let measured = false
    let selectedTarget: number | null = null
    let wheelSession = { direction: 0, time: 0, distance: 0, fired: false }
    let touchGesture: { id: number; x: number; y: number; startScroll: number; origin: number; distance: number; captured: boolean; native: boolean; axis: 'x' | 'y' | null } | null = null
    let drag: { id: number; startY: number; startScroll: number; moved: boolean; origin: number } | null = null
    const stop = () => {
      controls.current?.stop()
      controls.current = null
      programmatic = false
      clearTimeout(timer)
      selectedTarget = null
    }
    const select = (index: number, behavior: ScrollBehavior = 'smooth') => {
      stop()
      const target = start.get() + clamp(Math.round(index), 0, lastScene) * step.get()
      selectedTarget = clamp(Math.round(index), 0, lastScene)
      if (reducedMotion || behavior !== 'smooth') { window.scrollTo({ top: target, behavior: 'instant' }); return }
      programmatic = true
      controls.current = animate(window.scrollY, target, {
        type: 'spring', stiffness: config.stiffness, damping: config.damping, mass: config.mass,
        restDelta: 0.5, restSpeed: 1,
        onUpdate: value => window.scrollTo({ top: value, behavior: 'instant' }),
        onComplete: () => { window.scrollTo({ top: target, behavior: 'instant' }); programmatic = false; controls.current = null },
      })
    }
    goToRef.current = select
    relativeRef.current = direction => select((selectedTarget ?? Math.round((window.scrollY - start.get()) / step.get())) + direction)
    const settleNearest = () => {
      clearTimeout(timer)
      if (programmatic || touching || drag) return
      const offset = window.scrollY - start.get()
      if (offset < 0 || offset > lastScene * step.get()) return
      const nearest = Math.round(offset / step.get())
      if (Math.abs(offset - nearest * step.get()) > 0.5) select(nearest)
    }
    const scheduleSnap = () => {
      clearTimeout(timer)
      if (!programmatic) selectedTarget = null
      if (programmatic || touching || drag) return
      timer = setTimeout(settleNearest, SCROLL_STORY_DEFAULTS.snapDelayMs)
    }
    const measure = () => {
      const oldOffset = (window.scrollY - start.get()) / step.get()
      const wasWithin = window.scrollY >= start.get() && oldOffset <= lastScene
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
      const nextStep = clamp(element.clientHeight * SCROLL_STORY_DEFAULTS.stepRatio, SCROLL_STORY_DEFAULTS.minStep, SCROLL_STORY_DEFAULTS.maxStep)
      const oldStep = step.get()
      start.set(trackElement.getBoundingClientRect().top + window.scrollY - headerHeight)
      frameHeight.set(element.clientHeight)
      imageWidth.set(Math.min(config.mainWidth, cards.clientWidth * 0.84, cards.clientHeight * 0.64 * config.aspectRatio))
      step.set(nextStep)
      if (measured && wasWithin && Math.abs(oldStep - nextStep) > 1) {
        stop()
        cancelAnimationFrame(resizeFrame)
        resizeFrame = requestAnimationFrame(() => window.scrollTo({ top: start.get() + oldOffset * nextStep, behavior: 'instant' }))
      }
      measured = true
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(cards)
    const onWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('[data-story-interactive]')) return
      if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY) || touching || drag) return
      const offset = window.scrollY - start.get()
      const end = lastScene * step.get()
      const direction = Math.sign(event.deltaY)
      // Outside the sequence and outward at its limits, keep document scrolling.
      if (offset < -1 || offset > end + 1 || (offset <= 1 && direction < 0) || (offset >= end - 1 && direction > 0)) return
      event.preventDefault()
      const now = performance.now()
      if (now - wheelSession.time > SCROLL_STORY_DEFAULTS.wheelGestureIdleMs || direction !== wheelSession.direction) {
        wheelSession = { direction, time: now, distance: 0, fired: false }
      }
      wheelSession.time = now
      // Trackpad momentum belongs to the original gesture, not to extra steps.
      if (wheelSession.fired) return
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? frameHeight.get() : 1)
      wheelSession.distance += pixels
      if (Math.abs(wheelSession.distance) < SCROLL_STORY_DEFAULTS.wheelThreshold) return
      const origin = selectedTarget ?? Math.round(offset / step.get())
      wheelSession.fired = true
      select(gestureTarget(origin, wheelSession.distance, lastScene, SCROLL_STORY_DEFAULTS.wheelThreshold))
    }
    const onTouchStart = (event: TouchEvent) => {
      touching = true
      if ((event.target as HTMLElement).closest('[data-story-interactive]')) { touchGesture = null; stop(); return }
      wheelSession.fired = false
      if (event.touches.length !== 1) { touchGesture = null; setDragging(false); stop(); return }
      const touch = event.touches[0]
      const offset = window.scrollY - start.get()
      const origin = selectedTarget ?? Math.round(offset / step.get())
      stop()
      touchGesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, startScroll: window.scrollY, origin: clamp(origin, 0, lastScene), distance: 0, captured: false, native: offset < -1 || offset > lastScene * step.get() + 1, axis: null }
    }
    const onTouchMove = (event: TouchEvent) => {
      if (!touchGesture || event.touches.length !== 1 || touchGesture.native) return
      const touch = Array.from(event.touches).find(item => item.identifier === touchGesture?.id)
      if (!touch) return
      const distance = touchGesture.y - touch.clientY
      if (!touchGesture.axis && Math.hypot(touch.clientX - touchGesture.x, distance) >= 6) {
        touchGesture.axis = Math.abs(distance) >= Math.abs(touch.clientX - touchGesture.x) ? 'y' : 'x'
      }
      if (touchGesture.axis !== 'y') return
      if (!touchGesture.captured && ((touchGesture.startScroll <= start.get() + 1 && distance < 0) || (touchGesture.startScroll >= start.get() + lastScene * step.get() - 1 && distance > 0))) {
        touchGesture.native = true
        return
      }
      if (!event.cancelable) { touchGesture.native = true; return }
      event.preventDefault()
      if (!touchGesture.captured) { touchGesture.captured = true; setDragging(true) }
      touchGesture.distance = distance
      const nextOffset = touchGesture.startScroll + distance / Math.max(160, imageWidth.get()) * step.get() * config.dragSensitivity
      window.scrollTo({ top: clamp(nextOffset, start.get() + Math.max(0, touchGesture.origin - 1) * step.get(), start.get() + Math.min(lastScene, touchGesture.origin + 1) * step.get()), behavior: 'instant' })
    }
    const onTouchEnd = (event: TouchEvent) => {
      touching = event.touches.length > 0
      if (touching) return
      setDragging(false)
      const gesture = touchGesture
      touchGesture = null
      if (gesture?.captured) {
        setDragging(false)
        select(event.type === 'touchcancel' ? Math.round((window.scrollY - start.get()) / step.get()) : gestureTarget(gesture.origin, gesture.distance, lastScene, SCROLL_STORY_DEFAULTS.swipeThreshold))
      } else scheduleSnap()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as HTMLElement).closest('a, .gallery-controls, .position-rail, [data-story-interactive]')) return
      const origin = selectedTarget ?? Math.round((window.scrollY - start.get()) / step.get())
      stop()
      drag = { origin, id: event.pointerId, startY: event.clientY, startScroll: window.scrollY, moved: false }
      ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
      element.focus({ preventScroll: true })
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return
      const delta = drag.startY - event.clientY
      if (!drag.moved && Math.abs(delta) < 5) return
      if (!drag.moved) { drag.moved = true; setDragging(true) }
      window.scrollTo({ top: clamp(drag.startScroll + delta / Math.max(160, imageWidth.get()) * step.get() * config.dragSensitivity, start.get() + Math.max(0, drag.origin - 1) * step.get(), start.get() + Math.min(lastScene, drag.origin + 1) * step.get()), behavior: 'instant' })
      event.preventDefault()
    }
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return
      const { moved, origin, startY } = drag
      drag = null
      setDragging(false)
      if (!moved) return
      suppressClick = true
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => { suppressClick = false }, 0)
      select(event.type === 'pointerup' ? gestureTarget(origin, startY - event.clientY, lastScene, SCROLL_STORY_DEFAULTS.swipeThreshold) : Math.round((window.scrollY - start.get()) / step.get()))
    }
    const onClick = (event: MouseEvent) => { if (suppressClick) { event.preventDefault(); event.stopPropagation() } }
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('a, [data-story-interactive]')) return
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const from = selectedTarget ?? Math.round((window.scrollY - start.get()) / step.get())
      select(event.key === 'Home' ? 0 : event.key === 'End' ? lastScene : from + (event.key === 'ArrowDown' ? 1 : -1))
    }
    window.addEventListener('scroll', scheduleSnap, { passive: true })
    window.addEventListener('scrollend', settleNearest)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    element.addEventListener('lostpointercapture', onPointerUp)
    element.addEventListener('click', onClick, true)
    element.addEventListener('keydown', onKey)
    return () => {
      stop()
      clearTimeout(clickTimer)
      cancelAnimationFrame(resizeFrame)
      observer.disconnect()
      window.removeEventListener('scroll', scheduleSnap)
      window.removeEventListener('scrollend', settleNearest)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
      element.removeEventListener('lostpointercapture', onPointerUp)
      element.removeEventListener('click', onClick, true)
      element.removeEventListener('keydown', onKey)
    }
  }, [config, frameHeight, imageWidth, lastScene, reducedMotion, start, step])

  return (
    <motion.section ref={track} className="scroll-story" data-last-scene={lastScene} style={{ height: trackHeight }} aria-label="Inicio y proyectos musicales">
      <div ref={stage} className={`story-stage${dragging ? ' is-dragging' : ''}`} tabIndex={0} aria-label="Explorar inicio y proyectos" aria-describedby={helpId}>
        <motion.section className="home-intro story-home" style={{ y: homeY, scale: homeScale, opacity: homeOpacity, pointerEvents: homePointerEvents }} aria-hidden={!isHome} aria-labelledby="home-title">
          <div className="home-hero">
            <motion.p className="home-discipline" style={{ opacity: homeDetailOpacity }}>MÚSICA INDEPENDIENTE</motion.p>
            <h1 id="home-title">diego<span className="home-surname">suarez<span className="name-dot">.</span></span></h1>
            <motion.a className="projects-link" href="#/proyectos" style={{ opacity: homeDetailOpacity }} tabIndex={isHome ? 0 : -1} onClick={event => { if (window.location.hash === '#/proyectos') { event.preventDefault(); goToRef.current(1) } }}>Explorar proyectos <span className="project-count">{String(images.length).padStart(2, '0')}</span><span className="link-arrow" aria-hidden="true">↗</span></motion.a>
            <motion.div className="home-socials-reveal" style={{ opacity: homeDetailOpacity }}><HomeSocials active={isHome} /></motion.div>
          </div>
          <motion.div className="home-footer" style={{ opacity: homeDetailOpacity }}>
            <span className="home-copyright">© {new Date().getFullYear()} Diego Suarez</span>
          </motion.div>
        </motion.section>
        <motion.section id="proyectos" className="gallery story-gallery" style={{ opacity: galleryOpacity, pointerEvents: galleryPointerEvents, zIndex: galleryZ }} aria-hidden={!isProject} aria-label="Proyectos musicales">
          <div ref={carousel} className="carousel" role="region" aria-roledescription="carrusel" aria-label="Carrusel de proyectos musicales">
            {images.map((image, index) => <CarouselImage key={image.id} image={image} index={index} position={visualPosition} width={imageWidth} config={config} active={scene === index + 1} select={index => goToRef.current(index)} />)}
            <motion.div className="release-counter" style={{ opacity: captionOpacity }} aria-hidden="true"><span className="eyebrow">PROYECTOS</span><span className="caption-index">{String(projectNumber).padStart(2, '0')} <span>/ {String(images.length).padStart(2, '0')}</span></span></motion.div>
            <motion.div className="position-rail" style={{ opacity: captionOpacity }} aria-label="Seleccionar lanzamiento">{images.map((image, index) => <button key={image.id} tabIndex={isProject ? 0 : -1} className={scene === index + 1 ? 'is-active' : ''} aria-label={`Ir a lanzamiento ${index + 1}: ${image.title}`} aria-current={scene === index + 1 ? 'true' : undefined} onClick={() => goToRef.current(index + 1)}><span /></button>)}</motion.div>
          </div>
          <motion.div className="release-caption" style={{ opacity: captionOpacity }} aria-live="polite" aria-atomic="true"><span className="release-artist">{release?.artist}</span><h2>{release?.title}</h2><p>{release?.format} <span>·</span> {release?.year}</p>{release?.listenUrl && <a className="listen-link" tabIndex={isProject ? 0 : -1} href={release.listenUrl} target="_blank" rel="noreferrer">Escuchar <span aria-hidden="true">↗</span></a>}</motion.div>
          <motion.div className="gallery-bottom" style={{ opacity: captionOpacity }}><p id={helpId}><span className="scroll-symbol" aria-hidden="true">↕</span> Desliza para explorar <span className="keyboard-help">· ↑ ↓</span></p><div className="gallery-controls"><button tabIndex={isProject ? 0 : -1} aria-label={scene <= 1 ? 'Volver al inicio' : 'Lanzamiento anterior'} onClick={() => relativeRef.current(-1)}>↑</button><span aria-hidden="true">{String(projectNumber).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span><button tabIndex={isProject ? 0 : -1} aria-label="Lanzamiento siguiente" disabled={scene === images.length} onClick={() => relativeRef.current(1)}>↓</button></div></motion.div>
        </motion.section>
      </div>
    </motion.section>
  )
})
