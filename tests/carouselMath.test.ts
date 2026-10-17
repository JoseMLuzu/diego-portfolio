import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CAROUSEL_DEFAULTS, clamp, gestureTarget, imageGeometry } from '../src/components/carouselMath.ts'

const config = CAROUSEL_DEFAULTS
const geometry = (distance: number) => imageGeometry(distance, config.mainWidth, config)

test('scale changes continuously before the selected index changes', () => {
  assert.equal(geometry(0).scale, 1)
  for (let d = 0; d < 2; d += 0.01) {
    assert.ok(geometry(d).scale > geometry(d + 0.01).scale)
    assert.ok(Math.abs(geometry(d + 0.001).scale - geometry(d).scale) < 0.003)
  }
  assert.ok(geometry(0.25).scale < 1)
  assert.ok(geometry(0.25).scale > geometry(0.5).scale)
})

test('layout stays centered and symmetric in both navigation directions', () => {
  assert.equal(geometry(0).y, 0)
  for (let d = 0.1; d < 5; d += 0.1) {
    assert.ok(Math.abs(geometry(d).y + geometry(-d).y) < 0.00001)
    assert.equal(geometry(d).scale, geometry(-d).scale)
    assert.equal(geometry(d).zIndex, geometry(-d).zIndex)
  }
})

test('central images have space and outer thumbnails are more compact', () => {
  const height = config.mainWidth / config.aspectRatio
  for (let position = 0; position <= 1; position += 0.01) {
    const a = geometry(-position)
    const b = geometry(1 - position)
    assert.ok(b.y - a.y >= height * (a.scale + b.scale) / 2, `Overlap at ${position}`)
  }
  assert.ok(geometry(1).y > geometry(3).y - geometry(2).y)
  assert.ok(geometry(0).zIndex > geometry(1).zIndex)
})

test('responsive dimensions preserve scale, proportions and layout', () => {
  const wide = geometry(0.75)
  const small = imageGeometry(0.75, config.mainWidth / 2, config)
  assert.equal(small.scale, wide.scale)
  assert.equal(small.y, wide.y / 2)
  assert.equal(clamp(-3, 0, 8), 0)
  assert.equal(clamp(12, 0, 8), 8)
})


test('gesture snapping always targets the origin or exactly one adjacent scene', () => {
  assert.equal(gestureTarget(3, 12, 9, 12), 4)
  assert.equal(gestureTarget(3, -12, 9, 12), 2)
  assert.equal(gestureTarget(3, 10000, 9, 12), 4)
  assert.equal(gestureTarget(3, -10000, 9, 12), 2)
  assert.equal(gestureTarget(3, 5, 9, 12), 3)
  assert.equal(gestureTarget(0, -50, 9, 12), 0)
  assert.equal(gestureTarget(9, 50, 9, 12), 9)
})
