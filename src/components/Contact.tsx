import { ArrowIcon } from './ArrowIcon'
import { ContactForm } from './ContactForm'
import { contact } from '../data/contact'

export function Contact() {
  return (
    <>
      <section className="contact-content" aria-labelledby="contact-title">
        <p className="home-discipline">CONTACTO</p>
        <h1 id="contact-title">Hablemos<span>.</span></h1>
        <p className="contact-intro">Ideas, música y colaboraciones.</p>
        <ContactForm />
        {contact.email && (
          <address className="contact-address">
            <a href={`mailto:${contact.email}`}>{contact.email}<span aria-hidden="true"><ArrowIcon /></span></a>
          </address>
        )}
        {contact.links.length > 0 && (
          <ul className="contact-socials" aria-label="Redes y otros canales">
            {contact.links.map(link => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true"><ArrowIcon /></span></a></li>)}
          </ul>
        )}
      </section>
      <footer className="home-footer"><a href="#/proyectos">Ver proyectos <span aria-hidden="true"><ArrowIcon /></span></a><span>© {new Date().getFullYear()} Diego Suarez</span></footer>
    </>
  )
}
