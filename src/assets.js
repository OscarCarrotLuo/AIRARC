const APP_BASE = import.meta.env?.BASE_URL || '/';

export function publicAsset(path, base = APP_BASE) {
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`;
}

export function normalizeArtworkPath(source, base = APP_BASE) {
  return typeof source === 'string' && source.startsWith('/artwork/') ? publicAsset(source, base) : source;
}
