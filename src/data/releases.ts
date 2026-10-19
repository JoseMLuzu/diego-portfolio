export type Release = {
  id: string
  src: string
  alt: string
  title: string
  artist: string
  format: string
  year: string
  contribution: { roles: string[]; description: string }
  listenUrl?: string
}

// Demo releases: replace artwork, metadata, contribution examples and listening links.
// These credits are placeholders, not verified project credits.
const demoContribution = {
  roles: ['Producción', 'Composición'],
  description: 'Créditos de ejemplo. Reemplaza este texto por tu trabajo en este proyecto.',
}
export const releases: Release[] = [
  { id: 'orbita', src: '/covers/orbita.svg', alt: 'Portada de Órbita: anillos plateados sobre negro', title: 'Órbita', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'Single', year: '2024' },
  { id: 'despues', src: '/covers/despues.svg', alt: 'Portada de Después de las tres: luz violeta en la oscuridad', title: 'Después de las tres', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'EP', year: '2024' },
  { id: 'materia', src: '/covers/materia.svg', alt: 'Portada de Materia: formas verdes sobre negro', title: 'Materia', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'Single', year: '2025' },
  { id: 'frecuencia', src: '/covers/frecuencia.svg', alt: 'Portada de Frecuencia: ondas rojas y naranjas', title: 'Frecuencia', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'EP', year: '2026' },
  { id: 'ruido', src: '/covers/ruido.svg', alt: 'Portada de Ruido blanco: textura de ondas plateadas', title: 'Ruido blanco', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'Single', year: '2025' },
  { id: 'umbral', src: '/covers/umbral.svg', alt: 'Portada de Umbral: un rectángulo de luz azul', title: 'Umbral', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'EP', year: '2025' },
  { id: 'sin-senal', src: '/covers/sin-senal.svg', alt: 'Portada de Sin señal: líneas y luz ámbar', title: 'Sin señal', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'Single', year: '2025' },
  { id: 'desvelo', src: '/covers/desvelo.svg', alt: 'Portada de Desvelo: una luna de color azul', title: 'Desvelo', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'Single', year: '2026' },
  { id: 'ecos', src: '/covers/ecos.svg', alt: 'Portada de Ecos: ondas concéntricas en tonos crema', title: 'Ecos', artist: 'Diego Suarez', contribution: { ...demoContribution }, format: 'EP', year: '2026' },
]
