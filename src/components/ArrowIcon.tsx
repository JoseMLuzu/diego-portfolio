type Direction = 'up' | 'down' | 'up-right' | 'vertical'

const paths: Record<Direction, string> = {
  up: 'M12 20V4M5 11l7-7 7 7',
  down: 'M12 4v16M5 13l7 7 7-7',
  'up-right': 'M5 19 19 5M5 5h14v14',
  vertical: 'M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5',
}

/** Inline paths keep navigation icons consistent across mobile emoji fonts. */
export function ArrowIcon({ direction = 'up-right' }: { direction?: Direction }) {
  return <svg className="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[direction]} /></svg>
}
