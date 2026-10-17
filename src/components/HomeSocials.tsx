import { socialProfiles } from '../data/socials'

type Platform = keyof typeof socialProfiles
const platforms: { id: Platform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'appleMusic', label: 'Apple Music' },
]

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === 'instagram') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
  if (platform === 'spotify') return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <g stroke="#0b0b0c" strokeLinecap="round"><path d="M6.5 9.1c3.6-1.1 7.5-.9 11.1 1" strokeWidth="1.8" /><path d="M7.2 12.4c3-.9 6.4-.6 9.3 1" strokeWidth="1.6" /><path d="M7.8 15.6c2.5-.7 5.2-.4 7.7.8" strokeWidth="1.5" /></g>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.7 2.2a1 1 0 0 1 .3.7v12.7c0 1.9-1.4 3.2-3.3 3.2-1.6 0-2.7-.9-2.7-2.2 0-1.4 1-2.3 2.9-2.6l1.1-.2V7.2l-8 1.9v8.5c0 1.9-1.4 3.2-3.3 3.2-1.6 0-2.7-.9-2.7-2.2 0-1.4 1-2.3 2.9-2.6l1.1-.2V5.3a1 1 0 0 1 .8-1l10-2.3a1 1 0 0 1 .9.2Z" />
    </svg>
  )
}

export function HomeSocials({ active }: { active: boolean }) {
  return (
    <nav className="home-socials" aria-label="Redes y música de Diego Suarez">
      {platforms.map(platform => {
        const href = socialProfiles[platform.id]
        const content = <><PlatformIcon platform={platform.id} /><span>{platform.label}</span></>
        return href ? (
          <a className="home-social" key={platform.id} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${platform.label} de Diego Suarez (abre en otra pestaña)`} tabIndex={active ? 0 : -1}>{content}</a>
        ) : (
          <button className="home-social" key={platform.id} type="button" disabled title={`${platform.label}: perfil próximamente`} aria-label={`${platform.label}: perfil próximamente`}>{content}</button>
        )
      })}
    </nav>
  )
}
