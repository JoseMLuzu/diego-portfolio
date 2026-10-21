const { releases } = require('../../src/data/releases.ts')
const catalogRoute = /https:\/\/rr2covtm\.(?:api|apicdn)\.sanity\.io\/.*\/data\/query\/production\?/
async function mockCatalog(page, documents = releases) {
  await page.route(catalogRoute, route => route.fulfill({ json: { result: documents } }))
}
module.exports = { mockCatalog, catalogRoute, releases }
