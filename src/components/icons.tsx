import type { CSSProperties } from "react";

type IconProps = { size?: number; color?: string; style?: CSSProperties };

const A = "var(--accent)";

export function Logo({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <circle cx="12" cy="12" r="9" fill="#fff" opacity="0.9" />
      <path d="M8 12c0-2 1.5-4 4-4s4 2 4 4" stroke={A} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function GoogleG({ size = 16, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={style}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.68 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.15.8 3.88 1.5l2.65-2.55C16.9 3.1 14.7 2.1 12 2.1 6.98 2.1 2.9 6.2 2.9 12s4.08 9.9 9.1 9.9c5.25 0 8.75-3.7 8.75-8.9 0-.6-.07-1.05-.15-1.5H12z" />
    </svg>
  );
}

export function Plus({ size = 16, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function PaperPlane({ size = 16, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M3 11l18-8-8 18-2-8-8-2z" fill={color} />
    </svg>
  );
}

export function PhotoStack({ size = 26, color = "#fff" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} strokeWidth="1.6" />
      <circle cx="8.5" cy="10" r="1.7" fill={color} />
      <path d="M4 17l5-5 3.5 3.5L17 10l4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function ImageSmall({ size = 13, color = "var(--text-secondary)" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.6" />
      <circle cx="8" cy="10" r="1.4" fill={color} />
    </svg>
  );
}

export function SignOut({ size = 15, color = "var(--text-secondary)", style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={style}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M15 8l4 4-4 4M10 12h9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeft({ size = 14, color = "var(--text-secondary)" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Play({ size = 14, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <polygon points="6,4 20,12 6,20" fill={color} />
    </svg>
  );
}

export function BookIcon({ size = 14, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5zM13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5V3z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Envelope({ size = 15, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M4 6l8 5.5L20 6M4 6h16v12H4V6z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Copy({ size = 14, color = "#fff", style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={style}>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke={color} strokeWidth="1.8" />
      <rect x="4" y="4" width="11" height="11" rx="2" stroke={color} strokeWidth="1.8" opacity="0.6" />
    </svg>
  );
}

export function Users({ size = 15, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <circle cx="9" cy="8" r="2.6" fill={color} />
      <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="9" r="2" fill={color} opacity="0.6" />
      <path d="M15 14.2c2 .3 3.4 1.8 3.4 3.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" fill="none" />
    </svg>
  );
}

export function Camera({ size = 15, color = "#fff", style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={style}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" stroke={color} strokeWidth="1.8" />
      <path d="M8 7l1.6-2.5h4.8L16 7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <circle cx="12" cy="13.5" r="3.4" stroke={color} strokeWidth="1.8" fill="none" />
    </svg>
  );
}

export function Maximize({ size = 16, color = "#fff" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Minimize({ size = 16, color = "#fff" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Eye({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export function EyeOff({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3M6.4 6.4A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Download({ size = 15, color = "#fff" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M12 3v13m0 0l-5-5m5 5l5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function GuestBookIcon({ size = 15, color = A }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M9 10h6M9 14h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
