const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { mockCatalog, catalogRoute, releases } = require('./helpers/catalog.cjs')
const engine = require('playwright')[process.env.MOBILE_BROWSER || 'chromium']
const url = process.env.CAROUSEL_URL || 'http://127.0.0.1:5190'
let browser
before(async () => { browser = await engine.launch({ headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {}) }) })
after(async () => { await browser?.close() })

test('a delayed catalog opens the requested project, shows credits and keeps one-project boundaries usable on mobile', async () => {
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  let resolve
  const ready = new Promise(r => {resolve = r})
  await page.route(catalogRoute, async route => {
    const request = new URL(route.request().url())
    assert.equal(request.searchParams.get('perspective'), 'published')
    await ready
    await route.fulfill({json:{result:[{...releases[0],title:'Canción de prueba',contribution:{roles:['Mezcla'],description:'Mezcla del proyecto.'}}]}})
  })
  await page.goto(`${url}/#/proyectos`)
  await page.getByText('Cargando proyectos…', {exact:true}).waitFor()
  resolve()
  await page.locator('.release-caption h2').filter({hasText:'Canción de prueba'}).waitFor()
  await page.waitForFunction(() => document.querySelector('.carousel-image[aria-current]')?.dataset.imageIndex === '0')
  assert.equal(await page.locator('.carousel-image').count(),1)
  await page.getByRole('button',{name:'Mi participación',exact:true}).tap()
  await page.getByText('Mezcla del proyecto.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Ver invitación de contacto',exact:true}).tap()
  await page.waitForFunction(()=>document.querySelector('.story-outro').getAttribute('aria-hidden')==='false')
  await page.getByRole('button',{name:'Volver a proyectos',exact:true}).tap()
  await page.waitForFunction(()=>document.querySelector('.carousel-image[aria-current]')?.dataset.imageIndex==='0')
  await page.close()
})

test('empty published catalog shows a useful message and home still works', async () => {
  const page=await browser.newPage()
  await mockCatalog(page,[])
  await page.goto(`${url}/#/proyectos`)
  await page.getByText('Próximamente, nuevos proyectos.',{exact:true}).waitFor()
  assert.equal(await page.locator('.carousel-image').count(),0)
  await page.getByRole('link',{name:'Volver al inicio',exact:true}).click()
  await page.locator('#home-title').waitFor()
  await page.close()
})

test('a failed request can be retried without silently showing demo releases', async () => {
  const page=await browser.newPage()
  let fail=true
  await page.route(catalogRoute,route=>fail?route.fulfill({status:400,json:{error:{description:'Test error'}}}):route.fulfill({json:{result:[releases[0]]}}))
  await page.goto(`${url}/#/proyectos`)
  await page.getByText('No se pudieron cargar los proyectos.',{exact:true}).waitFor()
  assert.equal(await page.locator('.carousel-image').count(),0)
  fail=false
  await page.getByRole('button',{name:'Reintentar',exact:true}).click()
  await page.locator('.release-caption h2').filter({hasText:'Órbita'}).waitFor()
  await page.close()
})

for (const platform of ['Spotify', 'Apple Music']) {
  test(`${platform} opens independently from the record on compact phones`, async () => {
    const page = await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true})
    await mockCatalog(page,[{...releases[0], spotifyUrl:'https://streaming.example/spotify', appleMusicUrl:'https://streaming.example/apple-music'}])
    await page.context().route('https://streaming.example/**', route => route.fulfill({body:'<title>Streaming fixture</title>'}))
    await page.goto(`${url}/#/proyectos`)
    await page.getByRole('button',{name:'Mi participación',exact:true}).waitFor()
    const record = page.locator('[data-image-index="0"]')
    assert.equal(await record.getByRole('link').count(),0, 'Closed record must not expose links to assistive technology')
    await page.getByRole('button',{name:'Mi participación',exact:true}).tap()
    await page.waitForTimeout(650)
    const link=record.getByRole('link',{name:`Escuchar Órbita en ${platform}`,exact:true})
    const box=await link.boundingBox()
    assert.ok(box.width >= 43.9 && box.height >= 43.9 && box.y >= 0 && box.y+box.height <=568)
    const popupPromise=page.waitForEvent('popup')
    await link.tap()
    const popup=await popupPromise
    await popup.waitForLoadState()
    assert.equal(popup.url(), platform==='Spotify'?'https://streaming.example/spotify':'https://streaming.example/apple-music')
    assert.equal(await record.locator('.cover-action').getAttribute('aria-pressed'),'true')
    assert.equal(await record.getAttribute('aria-current'),'true')
    await popup.close()
    await page.bringToFront()
    // Keyboard activation also avoids WebKit's headless touch focus handoff
    // after closing a popup; the platform link above uses an actual touch.
    await page.getByRole('button',{name:'Guardar disco',exact:true}).focus()
    await page.keyboard.press('Enter')
    assert.equal(await record.getByRole('link').count(),0)
    assert.equal(await record.locator('a').first().getAttribute('tabindex'),'-1')
    await page.close()
  })
}
