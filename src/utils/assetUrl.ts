/** Resolve a public/ asset for Vite dev and Electron file:// builds. */
export function assetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file.replace(/^\//, '')}`;
}
