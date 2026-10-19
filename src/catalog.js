import { publicAsset, normalizeArtworkPath } from './assets.js';

export const PRODUCTS = {
  lanyard: { label: 'Lanyard', size: '54 × 85.6 mm', front: publicAsset('artwork/airarc-front.svg'), back: publicAsset('artwork/airarc-back.svg'), finish: 'glossy', template: publicAsset('templates/badge-templates.zip') },
  postcard: { label: 'Postcard', size: '148 × 105 mm', front: publicAsset('artwork/postcard-front.svg'), back: publicAsset('artwork/postcard-back.svg'), finish: 'matte', template: publicAsset('templates/postcard-templates.zip') },
  pin: { label: 'Pin', size: 'Ø 58 mm', front: publicAsset('artwork/pin-front.svg'), back: null, finish: 'glossy', template: publicAsset('templates/pin-templates.zip') }
};

export const MAX_PER_TYPE = 20;

export function exampleFor(type) {
  const product = PRODUCTS[type];
  return { id: `airarc-${type}`, type, name: `AIRARC / ${product.label}`, front: product.front, back: product.back, color: '#4d85c5', finish: product.finish, metal: 'silver', fit: 'cover', demo: true };
}

export function normalizeCollection(saved) {
  const items = saved.filter(item => item && typeof item.id === 'string' && typeof item.front === 'string').map(item => {
    const type = Object.hasOwn(PRODUCTS, item.type) ? item.type : 'lanyard';
    return { ...item, type, front: normalizeArtworkPath(item.front), back: normalizeArtworkPath(item.back) || PRODUCTS[type].back };
  });
  for (const type of Object.keys(PRODUCTS)) {
    if (!items.some(item => item.type === type)) items.push(exampleFor(type));
  }
  return items;
}
