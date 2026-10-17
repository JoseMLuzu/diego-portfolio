import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { Contact } from './components/Contact'
import { VerticalCarousel } from './components/VerticalCarousel'
import type { CarouselHandle } from './components/VerticalCarousel'
import { releases } from './data/releases'

type Page = 'home' | 'projects' | 'contact'
const currentPage = (): Page => {
  if (window.location.hash === '#/proyectos') return 'projects'
  if (window.location.hash === '#/contacto') return 'contact'
  return 'home'
}
const pageTitles: Record<Page, string> = { home: 'Diego Suarez — Música', projects: 'Proyectos — Diego Suarez', contact: 'Contacto — Diego Suarez' }

export default function App() {
  const [page, setPage] = useState(currentPage)
  const [visibleSection, setVisibleSection] = useState<'home' | 'projects'>('home')
  const main = useRef<HTMLElement>(null)
  const story = useRef<CarouselHandle>(null)
  const previousPage = useRef<Page | null>(null)
  const reducedMotion = useReducedMotion()
  const isContact = page === 'contact'

  function scrollToPage(target: Page, behavior: ScrollBehavior) {
    if (target !== 'contact') story.current?.scrollToScene(target === 'projects' ? 1 : 0, behavior)
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
    const frame = requestAnimationFrame(() => {
      const firstVisit = previousPage.current === null
      scrollToPage(page, firstVisit || reducedMotion || page === 'contact' ? 'instant' : 'smooth')
      previousPage.current = page
    })
    return () => cancelAnimationFrame(frame)
  }, [page, reducedMotion])


  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#/" onClick={event => navigate(event, 'home')} aria-label="Diego Suarez, inicio">diego<span className="wordmark-surname">suarez</span></a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#/" onClick={event => navigate(event, 'home')} aria-current={!isContact && visibleSection === 'home' ? 'page' : undefined}>Inicio</a>
          <a href="#/proyectos" onClick={event => navigate(event, 'projects')} aria-current={!isContact && visibleSection === 'projects' ? 'location' : undefined}>Proyectos</a>
          <a href="#/contacto" onClick={event => navigate(event, 'contact')} aria-current={isContact ? 'page' : undefined}>Contacto</a>
        </nav>
      </header>
      <main ref={main} tabIndex={-1} className={isContact ? 'contact-page' : 'home'}>
        {isContact ? <Contact /> : (
          <>
            <VerticalCarousel ref={story} images={releases} onSceneChange={scene => setVisibleSection(scene === 0 ? 'home' : 'projects')} />
            <footer className="projects-outro"><a href="#/contacto">Hablemos de tu próximo proyecto <span aria-hidden="true">↗</span></a></footer>
          </>
        )}
      </main>
    </>
  )
}
