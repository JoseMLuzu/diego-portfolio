const { mockCatalog } = require('./helpers/catalog.cjs')
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
  await mockCatalog(page)
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

test('record slides out on tap, fits compact screens and resets after navigation', async () => {
  const page = await open()
  const cover = page.locator('[data-image-index="0"]')
  await cover.tap()
  await page.waitForTimeout(500)
  assert.equal(await cover.locator('.cover-action').getAttribute('aria-pressed'), 'true')
  assert.equal(await cover.locator('.project-record').getAttribute('aria-hidden'), 'false')
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await centered(page, 1)
    const fits = await cover.locator('.record-content').evaluate(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)
    assert.ok(fits, 'Credits must fit inside the disc')
    const frame = await page.locator('.carousel').boundingBox()
    const disc = await cover.locator('.project-record').boundingBox()
    const sleeve = await cover.locator('.record-sleeve').boundingBox()
    assert.ok(disc.y >= frame.y - 1 && sleeve.y + sleeve.height <= frame.y + frame.height + 1, 'Open record and sleeve must stay inside the carousel')
    const toggle = await page.getByRole('button', { name: 'Guardar disco', exact: true }).boundingBox()
    assert.ok(toggle.height >= 44 && toggle.y >= 0 && toggle.y + toggle.height <= viewport.height)
  }
  await page.getByRole('button', { name: 'Guardar disco', exact: true }).tap()
  assert.equal(await cover.locator('.cover-action').getAttribute('aria-pressed'), 'false')
  await cover.locator('.cover-action').focus()
  await page.keyboard.press('Enter')
  assert.equal(await cover.locator('.cover-action').getAttribute('aria-pressed'), 'true')
  await page.keyboard.press('ArrowDown')
  await centered(page, 2)
  await page.getByRole('button', { name: 'Lanzamiento anterior', exact: true }).tap()
  await centered(page, 1)
  assert.equal(await cover.locator('.cover-action').getAttribute('aria-pressed'), 'false')
  await page.close()
})

test('reduced motion opens the record immediately without a slide transition', async () => {
  const page = await open()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await centered(page, 1)
  await page.getByRole('button', { name: 'Mi participación', exact: true }).tap()
  await page.waitForTimeout(40)
  const geometry = await page.locator('[data-image-index="0"] .project-record').evaluate(el => {
    const transform = new DOMMatrix(getComputedStyle(el).transform)
    return { y: transform.m42, size: el.clientWidth, opacity: getComputedStyle(el).opacity, rotation: transform.m12 }
  })
  assert.ok(Math.abs(geometry.y + geometry.size * 0.25) < 1)
  assert.equal(geometry.opacity, '1')
  assert.ok(Math.abs(geometry.rotation) < 0.001)
  await page.close()
})


test('streaming placeholder buttons fit mobile covers and do not contain links', async () => {
  const page = await open()
  const cover = page.locator('[data-image-index="0"]')
  await cover.tap()
  await page.waitForTimeout(500)
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await centered(page, 1)
    const fits = await cover.locator('.record-content').evaluate(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)
    assert.ok(fits, 'Credits and platform buttons must fit the disc')
    for (const platform of ['Spotify', 'Apple Music']) {
      const button = cover.getByRole('button', { name: platform, exact: true })
      assert.equal(await button.isDisabled(), true)
      const box = await button.boundingBox()
      assert.ok(box.height >= 43.9 && box.y >= 0 && box.y + box.height <= viewport.height)
    }
  }
  assert.equal(await cover.locator('a').count(), 0)
  assert.equal(await cover.locator('.cover-action').getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: 'Guardar disco', exact: true }).tap()
  await page.close()
})


test('record emerges progressively and can be put away by tapping its exposed top', async () => {
  const page = await open()
  const cover = page.locator('[data-image-index="0"]')
  const closed = await cover.boundingBox()
  await cover.tap()
  await page.waitForTimeout(100)
  const progress = await cover.locator('.project-record').evaluate(el => Number(getComputedStyle(el).opacity))
  assert.ok(progress > 0 && progress < 1, 'Record must animate between its closed and open states')
  await page.waitForTimeout(550)
  const disc = await cover.locator('.project-record').boundingBox()
  assert.ok(disc.y < closed.y - 10, 'Record must emerge above the original cover')
  await page.touchscreen.tap(disc.x + disc.width / 2, disc.y + 25)
  assert.equal(await cover.locator('.cover-action').getAttribute('aria-pressed'), 'false')
  await page.waitForTimeout(600)
  assert.equal(await cover.locator('.project-record').evaluate(el => getComputedStyle(el).opacity), '0')
  await page.close()
})

test('blurred record artwork stays circular on desktop through repeated openings', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  await mockCatalog(page)
  await page.goto(`${url}/#/proyectos`)
  await centered(page, 1)
  // A bright diagnostic texture makes any square layer leaking beyond the
  // circle visible in the rendered pixels, rather than just checking CSS.
  await page.addStyleTag({ content: `
    .record-art { background-image: none !important; background: #ff0000 !important; filter: blur(7px) !important; }
    .record-content, .record-grooves { visibility: hidden; }
    .project-record { background: transparent; box-shadow: none; border: 0; }
  ` })
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Mi participación', exact: true }).click()
    await page.waitForTimeout(650)
    const record = page.locator('[data-image-index="0"] .project-record')
    const bounds = await record.boundingBox()
    assert.ok(Math.abs(bounds.width - bounds.height) < 1, 'Record dimensions must stay square')
    const png = await record.screenshot()
    const samples = await page.evaluate(async base64 => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const pixel = (x, y) => Array.from(context.getImageData(Math.floor(image.width * x), Math.floor(image.height * y), 1, 1).data)
      return { center: pixel(0.5, 0.5), corners: [pixel(0.08, 0.08), pixel(0.92, 0.08)] }
    }, png.toString('base64'))
    assert.ok(samples.center[0] > 180 && samples.center[1] < 60, 'Diagnostic artwork must be rendered')
    assert.ok(samples.corners.every(pixel => pixel[0] < 80), `Artwork leaked outside the circle: ${JSON.stringify(samples)}`)
    await page.getByRole('button', { name: 'Guardar disco', exact: true }).click()
    await page.waitForTimeout(650)
  }
  await page.close()
})


test('the final contact form stays usable with a compact keyboard viewport and does not submit', async () => {
  const page = await open()
  let posts = 0
  page.on('request', request => { if (request.method() === 'POST') posts++ })
  assert.equal(await page.locator('.carousel-contact input').first().isDisabled(), true)
  await page.locator('.story-stage').focus()
  await page.keyboard.press('End')
  await page.waitForFunction(() => document.querySelector('.story-outro').getAttribute('aria-hidden') === 'false')
  const name = page.getByRole('textbox', {name:'Nombre',exact:true})
  const email = page.getByRole('textbox', {name:'Email',exact:true})
  const message = page.getByRole('textbox', {name:'Mensaje',exact:true})
  await name.fill('Diego')
  await email.fill('prueba@example.com')
  await message.fill('Un proyecto musical.')
  await page.setViewportSize({width:390,height:420})
  await page.waitForTimeout(150)
  await message.scrollIntoViewIfNeeded()
  const box = await message.boundingBox()
  assert.ok(box.y >= 80 && box.y + box.height <= 420)
  await page.keyboard.press('ArrowUp')
  assert.equal(await page.locator('.story-outro').getAttribute('aria-hidden'),'false')
  await page.locator('.carousel-contact').dispatchEvent('submit')
  assert.equal(posts,0)
  assert.equal(await page.getByRole('button',{name:/Enviar mensaje/}).isDisabled(),true)
  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'Volver a proyectos',exact:true}).tap()
  await centered(page,9)
  await page.getByRole('button',{name:'Ver invitación de contacto',exact:true}).tap()
  await page.waitForFunction(() => document.querySelector('.story-outro').getAttribute('aria-hidden') === 'false')
  assert.equal(await message.inputValue(),'Un proyecto musical.')
  await page.close()
})
