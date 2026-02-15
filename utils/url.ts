export const assetUrl = (p?: string | null): string => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return `${base}${normalized}`;
};

export const publicAssetUrl = (path: string): string => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${normalized}`;
};
