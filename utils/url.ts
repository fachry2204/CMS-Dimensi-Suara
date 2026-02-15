export const assetUrl = (p?: string | null): string => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return `${base}${normalized}`;
};

export const publicAssetUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, '');
  // Prefer runtime base from document for subpath deployments
  try {
    const baseUri = (globalThis as any)?.document?.baseURI;
    if (baseUri) {
      return new URL(normalized, baseUri).toString();
    }
  } catch {}
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return `${base}/${normalized}`;
};
