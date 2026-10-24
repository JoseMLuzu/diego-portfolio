import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { Listen } from './components/Listen'
import { Contact } from './components/Contact'
import { VerticalCarousel } from './components/VerticalCarousel'
import type { CarouselHandle } from './components/VerticalCarousel'
import { useReleases } from './hooks/useReleases'

type Page = 'home' | 'projects' | 'listen' | 'contact'
const currentPage = (): Page => {
  if (window.location.hash === '#/escucha') return 'listen'
  if (window.location.hash === '#/proyectos') return 'projects'
  if (window.location.hash === '#/contacto') return 'contact'
  return 'home'
}
const pageTitles: Record<Page, string> = { listen: 'Escucha — Diego Suarez', home: 'Diego Suarez — Música', projects: 'Proyectos — Diego Suarez', contact: 'Contacto — Diego Suarez' }

export default function App() {
  const { releases, status, retry } = useReleases()
  const catalogReady = status === 'ready' && releases.length > 0
  const [page, setPage] = useState(currentPage)
  const [visibleSection, setVisibleSection] = useState<'home' | 'projects' | 'outro'>('home')
  const main = useRef<HTMLElement>(null)
  const story = useRef<CarouselHandle>(null)
  const previousPage = useRef<Page | null>(null)
  const reducedMotion = useReducedMotion()
  const isContact = page === 'contact'
  const isListen = page === 'listen'
  const isStory = !isContact && !isListen

  function scrollToPage(target: Page, behavior: ScrollBehavior) {
    if (target === 'home' || target === 'projects') story.current?.scrollToScene(target === 'projects' ? 1 : 0, behavior)
    else {
      window.scrollTo({ top: 0, behavior: 'instant' })
      main.current?.focus({ preventScroll: true })
    }
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, target: Page) {
    // Repeated clicks still work when natural scrolling hasn't changed the hash.
    if (page === target) {
      event.preventDefault()
      scrollToPage(target, reducedMotion ? 'instant' : 'smooth')
    }
  }

  useEffect(() => {
    const onNavigate = () => setPage(currentPage())
    window.addEventListener('hashchange', onNavigate)
    return () => window.removeEventListener('hashchange', onNavigate)
  }, [])

  useEffect(() => {
    document.title = pageTitles[page]
    if (page === 'projects' && !catalogReady) return
    // Resolving the catalog must not reset a gesture already started on home.
    if (previousPage.current === page) return
    const frame = requestAnimationFrame(() => {
      const firstVisit = previousPage.current === null
      scrollToPage(page, firstVisit || reducedMotion || page === 'contact' ? 'instant' : 'smooth')
      previousPage.current = page
    })
    return () => cancelAnimationFrame(frame)
  }, [page, reducedMotion, catalogReady])


  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#/" onClick={event => navigate(event, 'home')} aria-label="Diego Suarez, inicio">diego<span className="wordmark-surname">suarez</span></a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#/" onClick={event => navigate(event, 'home')} aria-current={isStory && visibleSection === 'home' ? 'page' : undefined}>Inicio</a>
          <a href="#/proyectos" onClick={event => navigate(event, 'projects')} aria-current={isStory && visibleSection === 'projects' ? 'location' : undefined}>Proyectos</a>
          <a href="#/escucha" onClick={event => navigate(event, 'listen')} aria-current={isListen ? 'page' : undefined}>Escucha</a>
          <a href="#/contacto" onClick={event => navigate(event, 'contact')} aria-current={isContact ? 'page' : isStory && visibleSection === 'outro' ? 'location' : undefined}>Contacto</a>
        </nav>
      </header>
      <main ref={main} tabIndex={-1} className={isContact ? 'contact-page' : isListen ? 'listen-page' : 'home'}>
        {isContact ? <Contact /> : isListen ? <Listen /> : page === 'projects' && !catalogReady ? (
          <section className="catalog-status" aria-live="polite" aria-busy={status === 'loading'}>
            <p>{status === 'loading' ? 'Cargando proyectos…' : status === 'error' ? 'No se pudieron cargar los proyectos.' : 'Próximamente, nuevos proyectos.'}</p>
            {status === 'error' && <button type="button" onClick={retry}>Reintentar</button>}
            <a href="#/">Volver al inicio</a>
          </section>
        ) : (
          <VerticalCarousel ref={story} images={releases} onSceneChange={scene => setVisibleSection(scene === 0 ? 'home' : scene > releases.length ? 'outro' : 'projects')} />
        )}
      </main>
    </>
  )
}
