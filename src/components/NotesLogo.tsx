import { useStore } from '../store/useStore';
import logoHorizontal from '../assets/brand/logo-horizontal.svg';

export function NotesLogo() {
  const theme = useStore((s) => s.theme);

  return (
    <div className="p-[13px]">
      <img
        src={logoHorizontal}
        alt="Notes"
        className={`w-[130px] h-auto ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
        draggable={false}
      />
    </div>
  );
}
