import { HomeSocials } from './components/HomeSocials'

export default function App() {
  return <>
    <header className="site-header">
      <a className="wordmark" href="#/" aria-label="Diego Suarez, inicio">diego<span className="wordmark-surname">suarez</span></a>
      <nav className="site-nav" aria-label="Navegación principal">
        <a href="#/" aria-current="page">Inicio</a>
        <a href="#/proyectos">Proyectos</a>
        <a href="#/contacto">Contacto</a>
      </nav>
    </header>
    <main className="home">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-hero">
          <p className="home-discipline">MÚSICA INDEPENDIENTE</p>
          <h1 id="home-title">diego<span className="home-surname">suarez<span className="name-dot">.</span></span></h1>
          <a className="projects-link" href="#/proyectos">Explorar proyectos <span className="link-arrow" aria-hidden="true">↗</span></a>
          <div className="home-socials-reveal"><HomeSocials active /></div>
        </div>
        <footer className="home-footer"><span>© {new Date().getFullYear()} Diego Suarez</span></footer>
      </section>
    </main>
  </>
}
