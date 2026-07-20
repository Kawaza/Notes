type NotesLogoIconProps = {
  size?: number;
  className?: string;
};

/** App note mark — uses CSS primary colors so it follows the active palette. */
export function NotesLogoIcon({ size = 28, className }: NotesLogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="192" height="192" rx="36" className="fill-primary" />
      <circle cx="138" cy="54" r="16" className="fill-primary-foreground" />
      <path d="M0 192L0 132L60 192Z" className="fill-primary-foreground" />
    </svg>
  );
}
