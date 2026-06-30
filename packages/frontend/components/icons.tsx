import type { SVGProps } from "react";

/**
 * Inline SVG icon set. Tree-shakeable (each is a named export) and accessible:
 * decorative icons get `aria-hidden`, meaningful ones take an `aria-label`
 * (pass `title` or `aria-label` via props). All inherit `currentColor`.
 *
 * Stroke-based, 24×24 viewBox, 1.75 stroke — matches the lock motif used in
 * the logo and favicon.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ title, children, ...props }: IconProps & { title?: string }) {
  const labeled = Boolean(title || props["aria-label"]);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      role={labeled ? "img" : undefined}
      aria-hidden={labeled ? undefined : true}
      aria-label={props["aria-label"] ?? title}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" />
      <path d="M12 14.5v2.5" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.4 5.2A9.6 9.6 0 0 1 12 5c5.5 0 9 4.5 10 7-.4 1-1.2 2.4-2.5 3.7M6.2 6.2C3.9 7.6 2.5 9.8 2 12c1 2.5 4.5 7 10 7 1.2 0 2.3-.2 3.3-.5" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

/**
 * The product mark: a shield + lock with a small ciphertext glyph — the
 * visual metaphor for "encrypted solvency". Used in the header wordmark and
 * as the favicon (app/icon.svg). Sized via `width`/`height` props; defaults to
 * a 1em box for inline use.
 */
export function Logo({ size = 24, ...props }: IconProps & { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="FHE Proof-of-Reserves"
      {...props}
    >
      {/* shield */}
      <path
        d="M16 3l11 4.5v8c0 6.5-4.6 11.8-11 13.5C9.6 27.3 5 22 5 15.5v-8L16 3z"
        fill="#0F1437"
        stroke="#FFD700"
        strokeWidth="1.5"
      />
      {/* padlock body */}
      <rect x="11" y="15" width="10" height="7.5" rx="1.4" fill="#FFD700" />
      {/* shackle */}
      <path
        d="M13 15v-2.2a3 3 0 0 1 6 0V15"
        fill="none"
        stroke="#FFD700"
        strokeWidth="1.5"
      />
      {/* ciphertext dot row inside the lock */}
      <circle cx="13.5" cy="18.7" r="0.9" fill="#0A0E27" />
      <circle cx="16" cy="18.7" r="0.9" fill="#0A0E27" />
      <circle cx="18.5" cy="18.7" r="0.9" fill="#0A0E27" />
    </svg>
  );
}
