import { useCallback, useEffect, useState } from 'react'
import type { Release } from '../data/releases'

type Catalog = { status: 'loading' | 'ready' | 'error'; releases: Release[] }

export function useReleases() {
  const [catalog, setCatalog] = useState<Catalog>({ status: 'loading', releases: [] })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => { setCatalog({ status: 'loading', releases: [] }); setAttempt(value => value + 1) }, [])
  useEffect(() => {
    const controller = new AbortController()
    import('../lib/sanity').then(({ fetchReleases }) => fetchReleases(controller.signal)).then(releases => {
      if (!controller.signal.aborted) setCatalog({ status: 'ready', releases })
    }).catch(() => {
      if (!controller.signal.aborted) setCatalog({ status: 'error', releases: [] })
    })
    return () => controller.abort()
  }, [attempt])
  return { ...catalog, retry }
}
