import logoIcon from '../assets/brand/logo-icon.svg';

type NotesLogoIconProps = {
  size?: number;
  className?: string;
};

export function NotesLogoIcon({ size = 28, className }: NotesLogoIconProps) {
  return (
    <img
      src={logoIcon}
      alt=""
      aria-hidden
      className={className}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
