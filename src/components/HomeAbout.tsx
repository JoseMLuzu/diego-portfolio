import { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { about } from '../data/about'

export function HomeAbout({ active }: { active: boolean }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const id = useId()
  const open = active && (hovered || pinned)

  useEffect(() => {
    if (!active) { setHovered(false); setPinned(false) }
  }, [active])

  useEffect(() => {
    if (!open) return
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) { setPinned(false); setHovered(false) }
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPinned(false); setHovered(false) }
    }
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div
      ref={root}
      className="home-about"
      data-open={open}
      data-story-interactive="true"
      onPointerEnter={event => { if (event.pointerType === 'mouse' && matchMedia('(hover: hover)').matches) setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPinned(false) }}
    >
      <motion.div
        id={id}
        className="home-about-panel"
        role="region"
        aria-label="Sobre Diego Suarez"
        aria-hidden={!open}
        initial={false}
        animate={{ opacity: open ? 1 : 0.055, filter: reducedMotion || open ? 'blur(0px)' : 'blur(5px)', y: reducedMotion || open ? 0 : 12 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="home-about-copy">
          <span className="about-eyebrow">{about.title}</span>
          <p>{about.description}</p>
        </div>
      </motion.div>
      <button type="button" className="home-about-trigger" aria-expanded={open} aria-controls={id} tabIndex={active ? 0 : -1} onClick={() => setPinned(value => !value)}>
        Sobre mí <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
    </div>
  )
}
