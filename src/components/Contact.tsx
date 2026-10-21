import { ArrowIcon } from './ArrowIcon'
import { contact } from '../data/contact'

export function Contact() {
  const channels = [
    { label: 'WHATSAPP', text: 'Hablemos por WhatsApp', href: contact.whatsappUrl },
    { label: 'EMAIL', text: contact.email || 'Correo electrónico', href: contact.email ? `mailto:${contact.email}` : null },
  ]
  return (
    <section className="contact-content" aria-labelledby="contact-title">
      <h1 id="contact-title" className="sr-only">Contacto</h1>
      <address className="contact-channels">
        {channels.map(channel => {
          const content = <><span className="contact-channel-label">{channel.label}</span><span className="contact-channel-value">{channel.text}</span><ArrowIcon /></>
          return channel.href
            ? <a className="contact-channel" key={channel.label} href={channel.href} target={channel.label === 'WHATSAPP' ? '_blank' : undefined} rel={channel.label === 'WHATSAPP' ? 'noopener noreferrer' : undefined}>{content}</a>
            : <span className="contact-channel" key={channel.label} aria-disabled="true">{content}</span>
        })}
      </address>
    </section>
  )
}
