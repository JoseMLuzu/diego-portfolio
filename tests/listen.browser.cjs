const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { mockCatalog, catalogRoute } = require('./helpers/catalog.cjs')
const engine = require('playwright')[process.env.MOBILE_BROWSER || 'chromium']
const url = process.env.CAROUSEL_URL || 'http://127.0.0.1:5190'
let browser
before(async () => { browser=await engine.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})}) })
after(async () => {await browser?.close()})

const {wav} = require('./helpers/audio.cjs')
const comparison={title:'Un mismo fragmento',beforeUrl:'https://audio.example/before.wav',afterUrl:'https://audio.example/after.wav'}
async function open({empty=false,fail=false,failMedia=false,viewport={width:390,height:844}}={}) {
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true})
  await mockCatalog(page)
  await page.route(catalogRoute,route=>{
    const query=new URL(route.request().url()).searchParams.get('query') || ''
    if(!query.includes('audioComparison')) return route.fallback()
    if(fail) return route.fulfill({status:400,json:{error:{description:'Fixture error'}}})
    return route.fulfill({json:{result:empty?null:comparison}})
  })
  let mediaFailed=false
  await page.route('https://audio.example/**',route=>{
    if(failMedia&&!mediaFailed&&route.request().url().includes('after')) { mediaFailed=true; return route.fulfill({status:404,body:'Missing fixture'}) }
    const buffer=wav(route.request().url().includes('before')?6:8,route.request().url().includes('before')?220:440)
    const range=route.request().headers().range?.match(/bytes=(\d+)-(\d*)/)
    const start=range?Number(range[1]):0, end=range&&range[2]?Math.min(Number(range[2]),buffer.length-1):buffer.length-1
    const body=buffer.subarray(start,end+1)
    return route.fulfill({status:range?206:200,headers:{'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Length':String(body.length),...(range?{'Content-Range':`bytes ${start}-${end}/${buffer.length}`}:{})},body})
  })
  await page.goto(`${url}/#/escucha`)
  if(!empty&&!fail&&!failMedia) await page.waitForFunction(()=>document.querySelector('#audio-progress')?.disabled===false)
  return page
}
const media=page=>page.locator('audio').evaluateAll(elements=>elements.map(el=>({time:el.currentTime,paused:el.paused,duration:el.duration})))

test('audio never autoplays; A/B switches at the same second and only one version plays',async()=>{
  const page=await open()
  assert.ok((await media(page)).every(audio=>audio.paused))
  assert.equal(await page.locator('#audio-progress').getAttribute('max'),'6')
  await page.getByRole('button',{name:'Reproducir audio',exact:true}).tap()
  await page.waitForFunction(()=>document.querySelector('audio').currentTime>0.5)
  const before=(await media(page))[0].time
  await page.getByRole('button',{name:'B Después',exact:true}).tap()
  await page.waitForFunction(()=>!document.querySelectorAll('audio')[1].paused)
  let state=await media(page)
  assert.equal(state[0].paused,true)
  assert.ok(Math.abs(state[1].time-before)<0.6)
  for(const label of ['A Antes','B Después','A Antes','B Después']) await page.getByRole('button',{name:label,exact:true}).tap()
  state=await media(page)
  assert.equal(state.filter(audio=>!audio.paused).length,1)
  await page.getByRole('button',{name:'Pausar audio',exact:true}).tap()
  state=await media(page)
  assert.ok(state.every(audio=>audio.paused))
  const paused=state[1].time
  await page.getByRole('button',{name:'A Antes',exact:true}).tap()
  state=await media(page)
  assert.ok(state.every(audio=>audio.paused))
  assert.ok(Math.abs(state[0].time-paused)<0.1)
  await page.close()
})

test('keyboard seeking, compact layouts and leaving the section clean up playback',async()=>{
  const page=await open({viewport:{width:320,height:568}})
  const slider=page.getByRole('slider',{name:'Posición del audio'})
  await slider.focus()
  await page.keyboard.press('End')
  await page.waitForFunction(()=>document.querySelector('audio').currentTime>=5.9)
  await page.keyboard.press('Home')
  assert.ok((await media(page)).every(audio=>audio.time<0.1))
  for(const viewport of [{width:320,height:568},{width:844,height:390},{width:1440,height:960}]) {
    await page.setViewportSize(viewport)
    const boxes=await page.locator('.site-nav a,.wordmark,.audio-play,.audio-versions button,#audio-progress').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().toJSON()))
    assert.ok(boxes.every(box=>box.width>=43.9&&box.height>=43.9&&box.x>=0&&box.right<=viewport.width&&box.y>=0&&box.bottom<=viewport.height),JSON.stringify({viewport,boxes}))
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  }
  await page.getByRole('button',{name:'Reproducir audio',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('audio').paused)
  await page.evaluate(()=>{window.oldAudio=[...document.querySelectorAll('audio')]})
  await page.getByRole('link',{name:'Contacto',exact:true}).click()
  await page.locator('.contact-channels').waitFor()
  assert.equal(await page.locator('audio').count(),0)
  assert.ok(await page.evaluate(()=>window.oldAudio.every(audio=>audio.paused)))
  await page.close()
})

test('unpublished comparison has a quiet empty state',async()=>{
  const page=await open({empty:true})
  await page.getByText('Próximamente podrás escuchar la diferencia.',{exact:true}).waitFor()
  assert.equal(await page.locator('audio').count(),0)
  await page.close()
})


test('a failed media file can be retried without autoplay',async()=>{
  const page=await open({failMedia:true})
  await page.getByText('No se pudo cargar o reproducir el audio.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Reintentar audio',exact:true}).tap()
  await page.waitForFunction(()=>document.querySelector('#audio-progress')?.disabled===false)
  assert.ok((await media(page)).every(audio=>audio.paused))
  await page.close()
})

test('a failed catalog request can be retried independently',async()=>{
  const page=await open({fail:true})
  await page.getByText('No se pudo cargar la comparación.',{exact:true}).waitFor()
  await page.route(catalogRoute,route=>route.fulfill({json:{result:comparison}}))
  await page.getByRole('button',{name:'Reintentar',exact:true}).tap()
  await page.waitForFunction(()=>document.querySelector('#audio-progress')?.disabled===false)
  assert.ok((await media(page)).every(audio=>audio.paused))
  await page.close()
})
