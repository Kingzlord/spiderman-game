import type { CSSProperties, ReactNode } from 'react';

export type IconName = 'play' | 'pause' | 'sound' | 'muted' | 'expand' | 'shrink' | 'trophy' | 'arrow' | 'close' | 'restart' | 'mouse' | 'help' | 'pin' | 'web' | 'left' | 'right' | 'up' | 'down' | 'enter' | 'check' | 'bolt';

export function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const paths: Record<IconName, ReactNode> = {
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" strokeLinejoin="round" />,
    pause: <path d="M8 5v14M16 5v14" strokeWidth="3" />,
    sound: <path d="m11 4-5 4H3v8h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />,
    muted: <path d="m11 4-5 4H3v8h3l5 4zM16 9l6 6m0-6-6 6" />,
    expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
    shrink: <path d="M4 9h5V4m6 0v5h5M9 20v-5H4m16 0h-5v5" />,
    trophy: <path d="M8 3h8v6a4 4 0 0 1-8 0zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v5m-5 3h10m-8-3h6v3" />,
    arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    restart: <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />,
    mouse: <><rect x="5.5" y="2" width="13" height="20" rx="6.5" /><path d="M12 2v8M6 10h12" /><path d="M8 5h1v3H8z" fill="currentColor" stroke="none" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1.3-1.5 2.5M12 17h.01" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    web: <><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5M12 5l5 2 2 5-2 5-5 2-5-2-2-5 2-5Z" /><path d="m12 9 2 1 1 2-1 2-2 1-2-1-1-2 1-2Z" /></>,
    left: <path d="m14 6-6 6 6 6M8 12h12" />,
    right: <path d="m10 6 6 6-6 6M4 12h12" />,
    up: <path d="m6 14 6-6 6 6M12 8v12" />,
    down: <path d="m6 10 6 6 6-6M12 4v12" />,
    enter: <path d="M20 5v9H5m5-5-5 5 5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    bolt: <path d="m13 2-8 12h6l-1 8 9-13h-7z" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{paths[name]}</svg>;
}

export function SpiderMark({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 56 64" fill="currentColor" className={className} aria-hidden="true"><path d="m24 26-5-9-1-13 5 10 3 9h4l3-9 5-10-1 13-5 9 2 5 8-8 4-17 1 20-12 11 1 3 14-6 4-13-1 17-16 7-1 4 13 3 4 10-8-7-11-1-3 8h-6l-3-8-11 1-8 7 4-10 13-3-1-4-16-7-1-17 4 13 14 6 1-3L9 26l1-20 4 17 8 8z" /><path d="M24 19h8l2 9-6 6-6-6z" /></svg>;
}

export function SpiderMask({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 50 58" className={className} aria-hidden="true"><path d="M25 2C8 2 3 14 5 30c1 12 11 24 20 26 9-2 19-14 20-26C47 14 42 2 25 2Z" fill="#e7443b" stroke="#a92e32" strokeWidth="2" /><g fill="none" stroke="#8d2630" strokeWidth=".8"><path d="M25 3v51M12 6l10 21-13 15M38 6 28 27l13 15M6 17l19 10 19-10M6 33l19-6 19 6M12 46l13-19 13 19" /><path d="M8 13q17 12 34 0M5 24q20 13 40 0M7 36q18 11 36 0M14 47q11 5 22 0" /></g><path d="m8 19 14 9-3 11c-8-1-11-8-11-20Zm34 0-14 9 3 11c8-1 11-8 11-20Z" fill="#f5f0df" stroke="#18212b" strokeWidth="2.5" strokeLinejoin="round" /></svg>;
}

export function GoblinMask({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 58 62" className={className} aria-hidden="true"><path d="m12 30-11-8 5 19 11 2m29-13 11-8-5 19-11 2" fill="#86a357" stroke="#24382d" strokeWidth="2" /><path d="m13 24 15-7 17 8 2 17-10 13-8 6-9-6-10-14Z" fill="#96b15e" stroke="#294031" strokeWidth="2" /><path d="m10 31 1-17L25 3l14 2 9 10-14-2 7 11 4 6-15-8Z" fill="#805389" stroke="#45344f" strokeWidth="2" /><path d="m16 34 10 5-4 4-6-4Zm26 0-10 5 4 4 6-4Z" fill="#f0df8a" stroke="#354032" strokeWidth="1.5" /><path d="m19 48 9 3 11-5-5 10-7 1Z" fill="#2c392c" /><path d="m22 49 6 2 8-3-3 4-6 1Z" fill="#e5d7a0" /></svg>;
}