/** Resolve a public/ asset for both Vite dev server and Electron file:// builds. */
export function assetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file.replace(/^\//, '')}`;
}
