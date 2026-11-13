import type { ReactNode } from 'react';

export function SettingsSectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-10">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 border border-border/60 text-base font-semibold text-foreground/80">
        {icon}
      </div>
      <div className="pt-0.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
