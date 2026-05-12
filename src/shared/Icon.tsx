// SVG icon library — small, consistent stroke icons
import type { SVGProps } from 'react';

// `stroke` here is the stroke *width* (not color) — we omit the SVG-prop
// `stroke` so the two don't collide and get narrowed to `never`.
type IconProps = {
  name: string;
  size?: number;
  stroke?: number;
} & Omit<SVGProps<SVGSVGElement>, 'stroke'>;

export function Icon({ name, size = 20, stroke = 1.75, ...rest }: IconProps) {
  const s: SVGProps<SVGSVGElement> = {
    width: size, height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  };
  switch (name) {
    case 'logo': return (
      <svg {...s}>
        <path d="M4 14.5 L12 4 L20 14.5 L16 20 L8 20 Z" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="14" r="2.5" fill="#fff" stroke="none"/>
      </svg>
    );
    case 'map-pin': return <svg {...s}><path d="M12 22s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    case 'chart': return <svg {...s}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>;
    case 'sparkles': return <svg {...s}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/></svg>;
    case 'shield': return <svg {...s}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'layers': return <svg {...s}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/></svg>;
    case 'zap': return <svg {...s}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>;
    case 'database': return <svg {...s}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
    case 'building': return <svg {...s}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/><path d="M10 21v-4h4v4"/></svg>;
    case 'coffee': return <svg {...s}><path d="M4 8h14v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M18 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2M16 3v2"/></svg>;
    case 'users': return <svg {...s}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2.5-2-4.5-4.5-4.5"/></svg>;
    case 'arrow-right': return <svg {...s}><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
    case 'chevron-left': return <svg {...s}><path d="m15 6-6 6 6 6"/></svg>;
    case 'chevron-right': return <svg {...s}><path d="m9 6 6 6-6 6"/></svg>;
    case 'search': return <svg {...s}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'check': return <svg {...s}><path d="m5 12 5 5L20 7"/></svg>;
    case 'trending': return <svg {...s}><path d="M3 17 10 10l4 4 7-8"/><path d="M14 6h7v7"/></svg>;
    case 'filter': return <svg {...s}><path d="M3 4h18l-7 9v6l-4 2v-8L3 4Z"/></svg>;
    case 'bell': return <svg {...s}><path d="M6 8a6 6 0 1 1 12 0c0 4 2 5 2 7H4c0-2 2-3 2-7Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'settings': return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case 'home': return <svg {...s}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V10Z"/></svg>;
    case 'cpu': return <svg {...s}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>;
    case 'activity': return <svg {...s}><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>;
    case 'bookmark': return <svg {...s}><path d="M5 3h14v18l-7-4-7 4V3Z"/></svg>;
    case 'bookmark-filled': return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
        {...rest}
      >
        <path d="M5 3h14v18l-7-4-7 4V3Z" fill="var(--brand-600, #E85D1F)" />
      </svg>
    );
    case 'heart': return <svg {...s}><path d="M12 21s-8-4.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.5-8 11-8 11Z"/></svg>;
    case 'menu': return <svg {...s}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'plus': return <svg {...s}><path d="M12 5v14M5 12h14"/></svg>;
    case 'close': return <svg {...s}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'dot': return <svg {...s}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    case 'info': return <svg {...s}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>;
    case 'download': return <svg {...s}><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></svg>;
    case 'external': return <svg {...s}><path d="M14 4h6v6M20 4l-9 9M5 5h6M19 13v6H5V5"/></svg>;
    case 'mail': return <svg {...s}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
    case 'lock': return <svg {...s}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
    case 'clock': return <svg {...s}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'calendar': return <svg {...s}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'trash': return <svg {...s}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>;
    case 'star': return <svg {...s}><path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/></svg>;
    case 'eye': return <svg {...s}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'more': return <svg {...s}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>;
    case 'share': return <svg {...s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>;
    default: return null;
  }
}
