import { NotesLogoIcon } from './NotesLogoIcon';

export function NotesLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <NotesLogoIcon size={28} />
      <span className="font-semibold text-sm tracking-tight text-foreground">Notes</span>
    </div>
  );
}
