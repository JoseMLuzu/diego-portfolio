const { mockCatalog } = require('./helpers/catalog.cjs')
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const { mkdtemp, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { chromium } = require('playwright')
let browser, server, storage, base
before(async () => {
  storage = await mkdtemp(path.join(tmpdir(), 'diego-contact-browser-'))
  server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, CONTACT_PORT: '0', CONTACT_STORAGE_DIR: storage }, stdio: ['ignore', 'pipe', 'pipe'] })
  base = await new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error('Contact server did not start')), 10000)
    server.stdout.on('data', data => { output += data; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]) } })
    server.on('error', reject)
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)) })
  })
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) })
})
after(async () => { await browser?.close(); if (server?.exitCode === null) { const closed = once(server, 'exit'); server.kill('SIGTERM'); await closed } if (storage) await rm(storage, { recursive: true, force: true }) })
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, ...options })
  await mockCatalog(page)
  await page.goto(`${base}/#/contacto`)
  await page.locator('.contact-channels').waitFor()
  return page
}
test('about water reveals locally at the sides, follows the cursor and hides at the center', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  await mockCatalog(page)
  await page.goto(`${base}/#/`)
  assert.equal(await page.locator('.home-about').count(), 0, 'Archived popover must not render')
  const field = page.locator('.about-water')
  assert.equal(await field.evaluate(el => Number(getComputedStyle(el).opacity)), 0)
  await page.mouse.move(155, 410)
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.about-water')).opacity) > 0.95)
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('.about-water ellipse:last-child').getAttribute('cx')) - 155) < 2)
  const leftX = await field.locator('ellipse').last().getAttribute('cx')
  await page.mouse.move(1280, 600)
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('.about-water ellipse:last-child').getAttribute('cx')) - 1280) < 2)
  assert.ok(Number(await field.locator('ellipse').last().getAttribute('cx')) > Number(leftX) + 1000)
  await page.mouse.move(720, 400)
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.about-water')).opacity) < 0.01)
  assert.equal(await page.getByRole('button', { name: /Sobre mí/ }).count(), 0)
  await page.getByRole('link', { name: 'Proyectos', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.gallery').getAttribute('aria-hidden') === 'false')
  assert.equal(await field.evaluate(el => Number(getComputedStyle(el).opacity)), 0)
  await page.close()
})

test('about water supports touch, compact screens and reduced motion without moving the carousel', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await mockCatalog(page)
    await page.goto(`${base}/#/`)
    await page.reload()
    const field = page.locator('.about-water')
    await page.touchscreen.tap(12, 160)
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.about-water')).opacity) > 0.95)
    assert.equal(await field.locator('ellipse').last().getAttribute('cx'), '12')
    assert.equal(await field.locator('.about-water-copy').getAttribute('filter'), null)
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.about-water')).opacity) < 0.01)
    const box = await field.boundingBox()
    assert.ok(box.x >= 0 && box.y >= 64 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height)
    assert.equal(await page.evaluate(() => scrollY), 0, 'Revealing the biography must not move the carousel')
    assert.equal(await page.getByRole('button', { name: /Sobre mí/ }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  }
  await page.close()
})

test('contact contains only email and WhatsApp channels without a form or extra footer', async () => {
  const page = await open()
  assert.equal(await page.locator('.contact-channel').count(), 2)
  assert.deepEqual(await page.locator('.contact-channel-label').allTextContents(), ['WHATSAPP', 'EMAIL'])
  assert.equal(await page.locator('form, input, textarea, .contact-socials, .home-footer').count(), 0)
  for (const viewport of [{width:320,height:568},{width:844,height:390},{width:1440,height:960}]) {
    await page.setViewportSize(viewport)
    const channels = await page.locator('.contact-channel').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()))
    assert.ok(channels.every(box => box.height >= 44 && box.x >= 0 && box.right <= viewport.width && box.y >= 80 && box.bottom <= viewport.height))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  }
  await page.close()
})

test('mobile pages fit compact phones, larger phones and landscape with reachable controls', async () => {
  const page = await open({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true })
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    for (const route of ['', 'proyectos', 'contacto']) {
      await mockCatalog(page)
      await page.goto(`${base}/#/${route}`)
      if (route === 'proyectos') await page.waitForFunction(() => document.querySelector('.gallery').getAttribute('aria-hidden') === 'false' && Math.abs(scrollY - (document.querySelector('.scroll-story').getBoundingClientRect().height - document.querySelector('.story-stage').getBoundingClientRect().height) / Number(document.querySelector('.scroll-story').dataset.lastScene)) < 2)
      await page.waitForTimeout(80)
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        nav: [...document.querySelectorAll('.site-nav a, .wordmark')].map(element => { const box = element.getBoundingClientRect(); return { width: box.width, height: box.height, right: box.right } }),
        controls: document.querySelector('.gallery-bottom')?.getBoundingClientRect().bottom,
        viewport: innerHeight,
      }))
      assert.equal(layout.overflow, false, `${viewport.width}x${viewport.height} / ${route}`)
      assert.ok(layout.nav.every(box => box.width >= 44 && box.height >= 44 && box.right <= viewport.width))
      if (route === 'proyectos') {
        assert.ok(layout.controls <= layout.viewport + 1, `Controls below viewport: ${JSON.stringify(layout)}`)
        const hitAreas = await page.locator('.carousel-image').evaluateAll(elements => elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })))
        assert.ok(hitAreas.every(box => box.width >= 43.9 && box.height >= 43.9))
        const artwork = await page.locator('.carousel-image[aria-current] img').boundingBox()
        const stage = await page.locator('.carousel').boundingBox()
        assert.ok(artwork.y >= stage.y && artwork.y + artwork.height <= stage.y + stage.height)
        assert.ok(await page.getByRole('button', { name: 'Lanzamiento siguiente', exact: true }).isVisible())
      }
    }
  }
  await page.close()
})

test('home and projects share one pinned scroll timeline and navigation returns to its beginning', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await mockCatalog(page)
  await page.goto(`${base}/#/`)
  await page.locator('.story-home').waitFor()
  await page.waitForFunction(() => document.querySelectorAll('.carousel-image').length === 9)
  assert.equal(await page.locator('.carousel-image[aria-current]').count(), 0)
  const step = await page.evaluate(() => (document.querySelector('.scroll-story').getBoundingClientRect().height - document.querySelector('.story-stage').getBoundingClientRect().height) / Number(document.querySelector('.scroll-story').dataset.lastScene))
  await page.evaluate(y => scrollTo(0, y), step * 0.3)
  await page.waitForTimeout(60)
  const homeScale = await page.locator('.story-home').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a)
  assert.ok(homeScale < 0.95 && homeScale > 0.6)
  assert.equal(await page.locator('.carousel-image[aria-current]').count(), 0)
  await page.getByRole('link', { name: 'Proyectos', exact: true }).tap()
  await page.waitForFunction(() => document.querySelector('.gallery').getAttribute('aria-hidden') === 'false')
  await page.waitForTimeout(1000)
  assert.equal(await page.locator('.carousel-image[aria-current]').getAttribute('data-image-index'), '0')
  await page.getByRole('button', { name: 'Lanzamiento siguiente', exact: true }).tap()
  await page.waitForTimeout(1000)
  assert.equal(await page.locator('.carousel-image[aria-current]').getAttribute('data-image-index'), '1')
  await page.getByRole('link', { name: 'Inicio', exact: true }).tap()
  await page.waitForFunction(() => scrollY < 1)
  assert.equal(await page.locator('.carousel-image[aria-current]').count(), 0)
  await page.getByRole('link', { name: 'Contacto', exact: true }).tap()
  await page.locator('.contact-channels').waitFor()
  assert.equal(await page.locator('.scroll-story').count(), 0)
  await page.close()
})
