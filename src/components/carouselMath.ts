/** All distances are derived from the same fractional image position. */
export const CAROUSEL_DEFAULTS = {
  mainWidth: 360,
  aspectRatio: 1,
  thumbnailWidth: 72,
  gap: 16,
  falloff: 2.8,
  compression: 1.5,
  dragSensitivity: 1.12,
  stiffness: 620,
  damping: 38,
  mass: 0.55,
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
  snapDelayMs: 65,
  wheelGestureIdleMs: 150,
  wheelThreshold: 8,
  wheelRepeatDistance: 40,
  wheelRepeatIntervalMs: 110,
  swipeThreshold: 10,
  touchClickGuardMs: 450,
} as const

/** A completed gesture can only settle on its origin or an adjacent scene. */
export function gestureTarget(origin: number, distance: number, count: number, threshold: number) {
  return clamp(Math.round(origin) + (Math.abs(distance) >= threshold ? Math.sign(distance) : 0), 0, count)
}

/** Keep the left-opening record inside its frame and clear of desktop captions. */
export function recordGeometry(width: number, height: number, frameWidth: number, frameHeight: number) {
  const available = Math.max(1, frameWidth - 32)
  const disc = Math.min(CAROUSEL_DEFAULTS.mainWidth, available * 0.77, Math.max(1, frameHeight - 32))
  const sleeve = Math.min(width * 0.68, available * 0.32)
  const overlap = disc * 0.12
  const total = disc + sleeve - overlap
  const right = frameWidth >= 960 ? frameWidth / 2 + 200 : frameWidth - 16
  const center = Math.min(frameWidth / 2, right - total / 2)
  const shift = center - frameWidth / 2
  return {
    discX: shift - (total - disc) / 2,
    sleeveX: shift + (total - sleeve) / 2,
    discScale: disc / width,
    sleeveScale: sleeve / width,
    hitX: shift,
    hitScaleX: total / width,
    hitScaleY: Math.max(disc, height * sleeve / width) / height,
  }
}
