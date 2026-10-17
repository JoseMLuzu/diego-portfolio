/** All distances are derived from the same fractional image position. */
export const CAROUSEL_DEFAULTS = {
  mainWidth: 360,
  aspectRatio: 1,
  thumbnailWidth: 72,
  gap: 16,
  falloff: 2.8,
  compression: 1.5,
  dragSensitivity: 1,
  stiffness: 210,
  damping: 32,
  mass: 0.8,
} as const

export type CarouselConfig = { [K in keyof typeof CAROUSEL_DEFAULTS]: number }
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function imageGeometry(distance: number, width: number, config: CarouselConfig) {
  const thumbnailRatio = Math.min(config.thumbnailWidth / config.mainWidth, 1)
  const thumbnailHeight = width * thumbnailRatio / config.aspectRatio
  const mainHeight = width / config.aspectRatio
  const gap = config.gap * width / config.mainWidth
  const pitch = thumbnailHeight + gap
  const expansion = (mainHeight - thumbnailHeight) / 2 + gap
  const absoluteDistance = Math.abs(distance)
  return {
    y: distance * pitch + expansion * Math.tanh(distance * config.compression),
    scale: thumbnailRatio + (1 - thumbnailRatio) * Math.exp(-config.falloff * distance * distance),
    zIndex: 1000 - Math.round(absoluteDistance * 100),
  }
}

/** Native document scrolling is the shared timeline for home and releases. */
export const SCROLL_STORY_DEFAULTS = {
  stepRatio: 0.6,
  minStep: 260,
  maxStep: 440,
  snapDelayMs: 120,
  wheelGestureIdleMs: 220,
  wheelThreshold: 10,
  swipeThreshold: 12,
} as const

/** A completed gesture can only settle on its origin or an adjacent scene. */
export function gestureTarget(origin: number, distance: number, count: number, threshold: number) {
  return clamp(Math.round(origin) + (Math.abs(distance) >= threshold ? Math.sign(distance) : 0), 0, count)
}
