import { useId } from 'react'
import { ArrowIcon } from './ArrowIcon'
import { contact } from '../data/contact'

export function CarouselContact({ active }: { active: boolean }) {
  const id = useId()
  return (
    <form className="carousel-contact" data-story-interactive="true" aria-label="Cuéntame tu proyecto" onSubmit={event => event.preventDefault()}>
      <fieldset disabled={!active}>
        <legend className="sr-only">Datos de contacto y mensaje</legend>
        <div className="carousel-contact-fields">
          <label htmlFor={`${id}-name`}>Nombre<input id={`${id}-name`} name="name" autoComplete="name" placeholder="Tu nombre" maxLength={100} /></label>
          <label htmlFor={`${id}-email`}>Email<input id={`${id}-email`} name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="tu@email.com" maxLength={254} /></label>
        </div>
        <label htmlFor={`${id}-message`}>Mensaje<textarea id={`${id}-message`} name="message" placeholder="Cuéntame qué tienes en mente…" rows={3} maxLength={5000} /></label>
        <div className="carousel-contact-actions">
          <button type="submit" disabled>Enviar mensaje <span>Próximamente</span></button>
          {contact.whatsappUrl && <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1}>WhatsApp<ArrowIcon /></a>}
        </div>
      </fieldset>
    </form>
  )
}
