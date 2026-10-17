import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { about } from '../data/about'

// The lens reveals the actual biography; no decorative waves sit over the title.
export const ABOUT_WATER = {
  radius: 245,
  mobileRadius: 170,
  columnWidth: 260,
  lineHeight: 29,
  distortion: 13,
  touchLinger: 1300,
  follow: { stiffness: 105, damping: 24, mass: 0.65 },
}

function wrapCopy(copy: string, limit: number) {
  const lines: string[] = []
  for (const word of copy.split(/\s+/)) {
    const last = lines.length - 1
    if (last < 0 || lines[last].length + word.length + 1 > limit) lines.push(word)
    else lines[last] += ` ${word}`
  }
  return lines
}

export function HomeAboutWater({ active, opacity }: { active: boolean; opacity: MotionValue<number> }) {
  const svg = useRef<SVGSVGElement>(null)
  const displacement = useRef<SVGFEDisplacementMapElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [size, setSize] = useState({ width: 1440, height: 800 })
  const reduced = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const followX = useSpring(x, ABOUT_WATER.follow)
  const followY = useSpring(y, ABOUT_WATER.follow)
  const trailX = useSpring(x, { stiffness: 48, damping: 23 })
  const trailY = useSpring(y, { stiffness: 48, damping: 23 })
  const visibility = useMotionValue(0)
  const controls = useRef<ReturnType<typeof animate> | null>(null)
  const visible = useTransform(() => visibility.get() * opacity.get())
  const radius = size.width < 600 ? ABOUT_WATER.mobileRadius : ABOUT_WATER.radius
  const filterX = useTransform(() => (reduced ? x.get() : followX.get()) - radius * 1.3)
  const filterY = useTransform(() => (reduced ? y.get() : followY.get()) - radius * 1.1)
  const columnWidth = size.width < 600 ? 200 : ABOUT_WATER.columnWidth
  const lines = useMemo(() => wrapCopy(about.description, size.width < 600 ? 22 : 29), [size.width])
  const rows = Math.ceil(size.height / (lines.length * ABOUT_WATER.lineHeight + 52))

  useEffect(() => {
    const element = svg.current
    const home = element?.parentElement
    if (!element || !home) return
    const observer = new ResizeObserver(() => setSize({ width: home.clientWidth, height: home.clientHeight }))
    observer.observe(home)
    const reveal = (amount: number) => {
      controls.current?.stop()
      controls.current = animate(visibility, amount, { duration: reduced ? 0 : amount ? 0.22 : 0.7, ease: 'easeOut' })
    }
    const point = (event: PointerEvent) => {
      if (!active || (event.target as Element).closest('a, button')) return
      clearTimeout(timer.current)
      const box = home.getBoundingClientRect()
      const px = (event.clientX - box.left) * home.clientWidth / box.width
      const py = (event.clientY - box.top) * home.clientHeight / box.height
      // Keep the central name quiet; the reveal lives in the surrounding space.
      const edge = Math.min(px, home.clientWidth - px) / home.clientWidth
      const side = Math.max(0, Math.min(1, (0.42 - edge) / 0.13))
      x.set(px); y.set(py)
      reveal(side)
    }
    const leave = (event: PointerEvent) => { if (event.pointerType === 'mouse') reveal(0) }
    const endTouch = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') timer.current = setTimeout(() => reveal(0), ABOUT_WATER.touchLinger)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      reveal(0)
    }
    home.addEventListener('pointermove', point, { passive: true })
    home.addEventListener('pointerdown', point, { passive: true })
    home.addEventListener('pointerleave', leave)
    home.addEventListener('pointerup', endTouch)
    home.addEventListener('pointercancel', endTouch)
    home.addEventListener('keydown', key)
    if (!active) {
      reveal(0)
    }
    return () => {
      observer.disconnect()
      controls.current?.stop()
      clearTimeout(timer.current)
      home.removeEventListener('pointermove', point)
      home.removeEventListener('pointerdown', point)
      home.removeEventListener('pointerleave', leave)
      home.removeEventListener('pointerup', endTouch)
      home.removeEventListener('pointercancel', endTouch)
      home.removeEventListener('keydown', key)
    }
  }, [active, reduced, visibility, x, y])

  useAnimationFrame(time => {
    if (reduced || !active || visibility.get() < 0.005) return
    const speed = Math.min(9, Math.hypot(followX.getVelocity(), followY.getVelocity()) * 0.012)
    displacement.current?.setAttribute('scale', String(ABOUT_WATER.distortion + Math.sin(time * 0.002) * 4 + speed))
  })

  return <>
    <motion.svg ref={svg} className="about-water" width="100%" height="100%" style={{ opacity: visible }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-feather`}>
          <stop offset="0" stopColor="white" />
          <stop offset="0.45" stopColor="white" stopOpacity="0.95" />
          <stop offset="0.75" stopColor="white" stopOpacity="0.35" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-lens`} maskUnits="userSpaceOnUse" x="0" y="0" width={size.width} height={size.height}>
          <motion.ellipse cx={reduced ? x : trailX} cy={reduced ? y : trailY} rx={radius * 1.05} ry={radius * 0.72} fill={`url(#${id}-feather)`} opacity="0.35" />
          <motion.ellipse cx={reduced ? x : followX} cy={reduced ? y : followY} rx={radius} ry={radius * 0.8} fill={`url(#${id}-feather)`} />
        </mask>
        <motion.filter id={`${id}-water`} filterUnits="userSpaceOnUse" x={filterX} y={filterY} width={radius * 2.6} height={radius * 2.2} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap ref={displacement} in="SourceGraphic" in2="noise" scale={reduced ? 0 : ABOUT_WATER.distortion} xChannelSelector="R" yChannelSelector="G" />
        </motion.filter>
      </defs>
      <g mask={`url(#${id}-lens)`}>
        <g filter={reduced ? undefined : `url(#${id}-water)`} className="about-water-copy">
          {Array.from({ length: Math.ceil(size.width / columnWidth) }, (_, column) =>
            Array.from({ length: rows }, (_, row) => <text key={`${column}-${row}`} x={column * columnWidth + 20} y={38 + row * (lines.length * ABOUT_WATER.lineHeight + 52) + (column % 2) * 45}>
              {lines.map((line, index) => <tspan key={index} x={column * columnWidth + 20} dy={index === 0 ? 0 : ABOUT_WATER.lineHeight}>{line}</tspan>)}
            </text>))}
        </g>
      </g>
    </motion.svg>
    <p className="sr-only">{about.description}</p>
  </>
}
