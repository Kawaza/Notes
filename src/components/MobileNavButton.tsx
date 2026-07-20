import { Menu } from 'lucide-react';

export function MobileNavButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden p-2 -ml-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
