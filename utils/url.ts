export const assetUrl = (p?: string | null): string => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return `${base}${normalized}`;
};
