import { publicAsset, normalizeArtworkPath } from './assets.js';

export const PRODUCTS = {
  lanyard: { label: 'Lanyard', size: '54 × 85.6 mm', front: publicAsset('artwork/airarc-front.svg?v=c74f07b8'), back: publicAsset('artwork/airarc-back.svg?v=c74f07b8'), strap: publicAsset('artwork/lanyard-a.svg?v=70be7243'), finish: 'glossy', template: publicAsset('templates/badge-templates.zip?v=c74f07b8-70be7243') },
  postcard: { label: 'Postcard', size: '148 × 105 mm', front: publicAsset('artwork/postcard-front.svg?v=21d85060'), back: publicAsset('artwork/postcard-back.svg?v=21d85060'), finish: 'matte', template: publicAsset('templates/postcard-templates.zip?v=21d85060') },
  pin: { label: 'Pin', size: 'Ø 58 mm', front: publicAsset('artwork/pin-front.svg?v=1be772fc'), back: null, finish: 'glossy', template: publicAsset('templates/pin-templates.zip?v=1be772fc') }
};

export const MAX_PER_TYPE = 20;
export const PIN_CATALOG_REVISION = 'aviation-1be772fc';
export const PIN_DESIGNS = [
  ['attitude', 'Attitude', 'pin-front.svg'],
  ['heading', 'Heading', 'pin-heading.svg'],
  ['tail-fin', 'Tail Fin', 'pin-tail-fin.svg'],
  ['runway', 'Runway 27', 'pin-runway.svg'],
  ['gate', 'Gate 07', 'pin-gate.svg'],
  ['routes', 'Routes', 'pin-routes.svg'],
  ['globe', 'Globe', 'pin-globe.svg']
].map(([id, name, file]) => ({ id: `airarc-pin-${id}`, name: `AIRARC / ${name}`, file, front: publicAsset(`artwork/${file}?v=1be772fc`) }));

const BUILT_IN_ARTWORK = {
  'airarc-front.svg': PRODUCTS.lanyard.front,
  'airarc-back.svg': PRODUCTS.lanyard.back,
  'lanyard-a.svg': PRODUCTS.lanyard.strap,
  'lanyard-b.svg': publicAsset('artwork/lanyard-b.svg?v=70be7243'),
  'postcard-front.svg': PRODUCTS.postcard.front,
  'postcard-back.svg': PRODUCTS.postcard.back,
  ...Object.fromEntries(PIN_DESIGNS.map(design => [design.file, design.front]))
};

function refreshArtwork(source) {
  const match = typeof source === 'string' && source.startsWith('/') && source.match(/\/artwork\/([^/?#]+)(?:\?[^#]*)?$/);
  return (match && BUILT_IN_ARTWORK[match[1]]) || normalizeArtworkPath(source);
}

export function exampleFor(type) {
  const product = PRODUCTS[type];
  const item = { id: `airarc-${type}`, type, name: `AIRARC / ${product.label}`, front: product.front, back: product.back, color: '#4d85c5', finish: product.finish, metal: 'silver', fit: 'cover', demo: true };
  if (type === 'lanyard') item.strap = product.strap;
  if (type === 'pin') return { ...item, id: PIN_DESIGNS[0].id, name: PIN_DESIGNS[0].name, catalogRevision: PIN_CATALOG_REVISION };
  return item;
}

export function normalizeCollection(saved) {
  const items = saved.filter(item => item && typeof item.id === 'string' && typeof item.front === 'string').map(item => {
    const type = Object.hasOwn(PRODUCTS, item.type) ? item.type : 'lanyard';
    const next = { ...item, type, front: refreshArtwork(item.front), back: refreshArtwork(item.back) || PRODUCTS[type].back };
    if (Object.hasOwn(item, 'strap')) next.strap = refreshArtwork(item.strap);
    else if (type === 'lanyard' && item.demo && /^studio-(orange|black|sand)$/.test(item.id)) {
      next.strap = item.color === '#ffffff' ? BUILT_IN_ARTWORK['lanyard-b.svg'] : PRODUCTS.lanyard.strap;
    }
    if (type === 'pin' && item.id === 'airarc-pin' && next.front === PRODUCTS.pin.front) {
      next.id = PIN_DESIGNS[0].id;
      if (item.name === 'AIRARC / Pin') next.name = PIN_DESIGNS[0].name;
    }
    return next;
  });
  for (const type of ['lanyard', 'postcard']) {
    if (!items.some(item => item.type === type)) items.push(exampleFor(type));
  }
  const pins = items.filter(item => item.type === 'pin');
  if (!pins.some(item => item.catalogRevision === PIN_CATALOG_REVISION)) {
    let count = pins.length;
    for (const item of pins) item.catalogRevision = PIN_CATALOG_REVISION;
    for (const design of PIN_DESIGNS) {
      if (count >= MAX_PER_TYPE) break;
      if (!items.some(item => item.id === design.id)) {
        const { file, ...artwork } = design;
        items.push({ ...exampleFor('pin'), ...artwork });
        count++;
      }
    }
  }
  for (const type of Object.keys(PRODUCTS)) {
    if (!items.some(item => item.type === type)) items.push(exampleFor(type));
  }
  return items;
}
