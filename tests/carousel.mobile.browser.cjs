const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const engineName = process.env.MOBILE_BROWSER || 'chromium'
const engine = require('playwright')[engineName]
const url = process.env.CAROUSEL_URL || 'http://127.0.0.1:5190'
let browser

before(async () => {
  browser = await engine.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) })
})
after(async () => { await browser?.close() })

async function open() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  page.setDefaultTimeout(5000)
  await page.goto(`${url}/#/proyectos`)
  await page.evaluate(() => document.fonts.ready)
  await centered(page, 1)
  return page
}

async function centered(page, scene) {
  await page.waitForFunction(scene => {
    const track = document.querySelector('.scroll-story')
    const stage = document.querySelector('.story-stage')
    const step = (track.getBoundingClientRect().height - stage.getBoundingClientRect().height) / Number(track.dataset.lastScene)
    const image = document.querySelector('.carousel-image[aria-current]')
    return image?.getAttribute('data-image-index') === String(scene - 1) && Math.abs(scrollY - scene * step) < 0.5
  }, scene)
}

async function nextPoint(page) {
  const box = await page.getByRole('button', { name: 'Lanzamiento siguiente', exact: true }).boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function shortSwipe(page, distance, end = 'touchEnd') {
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 380 }] })
  for (let index = 1; index <= 4; index++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 380 - distance * index / 4 }] })
    await page.waitForTimeout(16)
  }
  await client.send('Input.dispatchTouchEvent', { type: end, touchPoints: [] })
  await client.detach()
}

test('a neutral touch during a transition resumes the intended project instead of returning', async () => {
  const page = await open()
  await page.locator('.story-stage').focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(20)
  await page.touchscreen.tap(18, 700)
  await centered(page, 2)
  await page.close()
})

test('two quick taps on the next arrow advance two projects without cancelling the first tap', async () => {
  const page = await open()
  const point = await nextPoint(page)
  await page.touchscreen.tap(point.x, point.y)
  await page.waitForTimeout(25)
  await page.touchscreen.tap(point.x, point.y)
  await centered(page, 3)
  await page.close()
})

test('resizing while a project is centering preserves its destination', async () => {
  const page = await open()
  await page.locator('.story-stage').focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(60)
  await page.setViewportSize({ width: 320, height: 568 })
  await centered(page, 2)
  await page.close()
})

test('a cancelled vertical swipe still completes its adjacent project', { skip: engineName !== 'chromium' }, async () => {
  const page = await open()
  await shortSwipe(page, 24, 'touchCancel')
  await centered(page, 2)
  await page.close()
})

test('a delayed swipe click cannot select the starting cover, but a new tap still works', { skip: engineName !== 'chromium' }, async () => {
  const page = await open()
  await shortSwipe(page, 24)
  await page.waitForTimeout(120)
  // Reproduce a compatibility click delivered after the touch sequence ends.
  await page.locator('[data-image-index="0"]').dispatchEvent('click')
  const point = await nextPoint(page)
  await page.touchscreen.tap(point.x, point.y)
  await centered(page, 3)
  await page.close()
})

test('a mobile swipe scales continuously with few layout passes and 44px touch targets', { skip: engineName !== 'chromium' }, async () => {
  const page = await open()
  const client = await page.context().newCDPSession(page)
  await client.send('Performance.enable')
  const metric = async name => (await client.send('Performance.getMetrics')).metrics.find(metric => metric.name === name).value
  const before = await metric('LayoutCount')
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 380 }] })
  for (let index = 1; index <= 18; index++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 380 - index * 5 }] })
    await page.waitForTimeout(16)
  }
  const size = await page.locator('[data-image-index="0"] img').evaluate(el => el.getBoundingClientRect().width / parseFloat(getComputedStyle(el).width))
  assert.ok(size > 0.2 && size < 0.95, 'Artwork must scale before releasing the gesture')
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await centered(page, 2)
  const layouts = await metric('LayoutCount') - before
  assert.ok(layouts < 20, `A single swipe triggered ${layouts} layout passes`)
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(150)
    const targets = await page.locator('.carousel-image').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()))
    assert.ok(targets.every(box => box.width >= 43.9 && box.height >= 43.9))
  }
  await page.close()
})
