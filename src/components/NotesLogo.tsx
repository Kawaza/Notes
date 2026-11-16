import { useStore } from '../store/useStore';
import { APP_DISPLAY_NAME } from '../constants/brand';
import logoHorizontal from '../assets/brand/logo-horizontal.svg';

export function NotesLogo() {
  const theme = useStore((s) => s.theme);

  return (
    <div className="p-[13px]">
      <img
        src={logoHorizontal}
        alt={APP_DISPLAY_NAME}
        className={`w-[130px] h-auto ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
        draggable={false}
      />
    </div>
  );
}
