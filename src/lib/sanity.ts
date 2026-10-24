import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'
import type { Release } from '../data/releases'

export const sanityClient = createClient({
  projectId: 'rr2covtm',
  dataset: 'production',
  apiVersion: '2026-10-20',
  perspective: 'published',
  // Fetch fresh published content when the page opens; no browser token needed.
  useCdn: false,
  timeout: 10000,
  maxRetries: 1,
})

const images = createImageUrlBuilder(sanityClient)
export const releasesQuery = `*[_type == "release" && visible == true && defined(cover.asset)]
  | order(order asc, title asc, _id asc) {
    "id": _id, title, artist, format, year, contribution, spotifyUrl, appleMusicUrl,
    "src": cover.asset->url, "alt": cover.alt,
    "crop": cover.crop, "hotspot": cover.hotspot
  }`

type PublishedRelease = Partial<Release> & {
  crop?: { top: number; bottom: number; left: number; right: number }
  hotspot?: { x: number; y: number; width: number; height: number }
}

function streamingUrl(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url.href : undefined
  } catch { return undefined }
}

export function normalizeReleases(documents: PublishedRelease[]): Release[] {
  return documents.flatMap(document => {
    if (!document.id || !document.title || !document.src) return []
    const src = document.src.startsWith('https://cdn.sanity.io/images/')
      ? images.image({ asset: { url: document.src }, crop: document.crop, hotspot: document.hotspot })
        .width(720).height(720).fit('crop').auto('format').quality(85).url()
      : document.src
    return [{
      id: document.id, title: document.title, src,
      spotifyUrl: streamingUrl(document.spotifyUrl),
      appleMusicUrl: streamingUrl(document.appleMusicUrl),
      alt: document.alt || `Portada de ${document.title}`,
      artist: document.artist || 'Diego Suarez', format: document.format || 'Single', year: document.year || '',
      contribution: {
        roles: document.contribution?.roles || [],
        description: document.contribution?.description || '',
      },
    }]
  })
}

export async function fetchReleases(signal?: AbortSignal): Promise<Release[]> {
  const documents = await sanityClient.fetch<PublishedRelease[]>(releasesQuery, {}, { signal })
  return normalizeReleases(documents)
}

export type AudioComparison = { title: string; beforeUrl: string; afterUrl: string }
export const audioComparisonQuery = `*[_type == "audioComparison" && _id == "audio-comparison" && visible == true][0]{
  title, "beforeUrl": before.asset->url, "afterUrl": after.asset->url
}`

export async function fetchAudioComparison(signal?: AbortSignal): Promise<AudioComparison | null> {
  const value = await sanityClient.fetch<AudioComparison | null>(audioComparisonQuery, {}, { signal })
  if (!value?.title || !value.beforeUrl || !value.afterUrl) return null
  return value
}
