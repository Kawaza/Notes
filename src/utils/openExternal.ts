export function openExternalUrl(url: string) {
  if (window.electronAPI?.openExternal) {
    void window.electronAPI.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
