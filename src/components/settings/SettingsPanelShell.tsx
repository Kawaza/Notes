import type { ReactNode } from 'react';

/** Centers settings content like the product mockups. */
export function SettingsPanelShell({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-2xl mx-auto min-h-[28rem]">{children}</div>;
}
