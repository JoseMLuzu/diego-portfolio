import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeReleases, releasesQuery, sanityClient } from '../src/lib/sanity.ts'

test('catalog reads only published visible releases with a cover and deterministic ordering', () => {
  assert.equal(sanityClient.config().perspective, 'published')
  assert.equal(sanityClient.config().token, undefined)
  assert.match(releasesQuery, /visible == true/)
  assert.match(releasesQuery, /defined\(cover.asset\)/)
  assert.match(releasesQuery, /order\(order asc, title asc, _id asc\)/)
})

test('cover URLs preserve crop metadata and request bounded square optimized images', () => {
  const [release] = normalizeReleases([{
    id: 'test', title: 'Test', src: 'https://cdn.sanity.io/images/rr2covtm/production/abcdef1234-1200x1000.jpg',
    crop: {left: 0.1, right: 0.1, top: 0, bottom: 0},
    hotspot: {x: 0.3, y: 0.5, width: 0.2, height: 0.5},
  }])
  const url = new URL(release.src)
  assert.equal(url.searchParams.get('w'), '720')
  assert.equal(url.searchParams.get('h'), '720')
  assert.equal(url.searchParams.get('auto'), 'format')
  assert.ok(url.searchParams.has('rect'))
  assert.equal(release.alt, 'Portada de Test')
  assert.deepEqual(release.contribution, { roles: [], description: '' })
})

test('incomplete releases are skipped without replacing them with example projects', () => {
  assert.deepEqual(normalizeReleases([{id: 'no-cover', title: 'Missing cover'}]), [])
  assert.deepEqual(normalizeReleases([]), [])
})

test('streaming links are optional and only absolute HTTPS links are exposed', () => {
  const base = {id: 'song', title: 'Song', src: '/covers/orbita.svg'}
  const [release] = normalizeReleases([{...base, spotifyUrl: ' https://open.spotify.com/track/example ', appleMusicUrl: 'https://music.apple.com/album/example'}])
  assert.equal(release.spotifyUrl, 'https://open.spotify.com/track/example')
  assert.equal(release.appleMusicUrl, 'https://music.apple.com/album/example')
  for (const value of ['javascript:alert(1)', 'http://example.com', '/relative', 'invalid', '']) {
    const [invalid] = normalizeReleases([{...base, spotifyUrl: value, appleMusicUrl: value}])
    assert.equal(invalid.spotifyUrl, undefined)
    assert.equal(invalid.appleMusicUrl, undefined)
  }
})
