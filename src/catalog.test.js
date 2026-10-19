import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCollection, PRODUCTS, PIN_DESIGNS, PIN_CATALOG_REVISION, MAX_PER_TYPE } from './catalog.js';

test('legacy uploads retain their artwork and become lanyards; new categories receive examples', () => {
  const legacy = { id: 'custom', name: 'Personal', front: 'data:image/png;base64,custom', back: 'data:image/png;base64,back', color: '#123456' };
  const migrated = normalizeCollection([legacy]);
  assert.deepEqual(migrated[0], { ...legacy, type: 'lanyard' });
  assert.deepEqual([...new Set(migrated.map(item => item.type))], ['lanyard', 'postcard', 'pin']);
  assert.equal(migrated.filter(item => item.type === 'pin').length, 7);
  assert.equal(legacy.type, undefined);
});

test('migration is idempotent, including pins that have a physical back instead of artwork', () => {
  const first = normalizeCollection([{ id: 'my-pin', type: 'pin', front: 'custom-pin', back: null }]);
  assert.deepEqual(normalizeCollection(first), first);
  assert.equal(first.filter(item => item.type === 'pin').length, 8);
  assert.equal(first[0].back, null);
});

test('invalid records cannot leave a category without a usable object', () => {
  const result = normalizeCollection([null, {}, { id: 'missing-image' }]);
  assert.deepEqual([...new Set(result.map(item => item.type))], Object.keys(PRODUCTS));
  assert.ok(result.every(item => item.front && item.name));
});

test('saved badge defaults refresh both faces and straps without replacing custom artwork or color choices', () => {
  const saved = [
    { id: 'studio-orange', demo: true, type: 'lanyard', front: '/artwork/airarc-front.svg', back: '/AIRARC/artwork/airarc-back.svg?v=old', color: '#4d85c5' },
    { id: 'studio-black', demo: true, type: 'lanyard', front: '/artwork/airarc-back.svg', back: '/artwork/airarc-front.svg', color: '#ffffff' },
    { id: 'studio-sand', demo: true, type: 'lanyard', front: 'data:image/png;base64,custom', back: 'data:image/png;base64,back', strap: null, color: '#213c5b' },
    { id: 'custom-strap', type: 'lanyard', front: 'my-art', strap: 'data:image/png;base64,strap', back: 'my-back' }
  ];
  const result = normalizeCollection(saved);
  assert.equal(result[0].front, PRODUCTS.lanyard.front);
  assert.equal(result[0].back, PRODUCTS.lanyard.back);
  assert.equal(result[0].strap, PRODUCTS.lanyard.strap);
  assert.equal(result[1].front, PRODUCTS.lanyard.back);
  assert.match(result[1].strap, /lanyard-b\.svg\?v=/);
  assert.deepEqual(result[2], saved[2]);
  assert.deepEqual(result[3], saved[3]);
  assert.equal(saved[0].strap, undefined);
});

test('aviation migration replaces the legacy example once and excludes blank artboards', () => {
  const saved = [{ id: 'airarc-pin', name: 'AIRARC / Pin', type: 'pin', front: '/artwork/pin-front.svg', back: null }];
  const result = normalizeCollection(saved);
  const pins = result.filter(item => item.type === 'pin');
  assert.equal(pins.length, 7);
  assert.equal(pins[0].id, 'airarc-pin-attitude');
  assert.ok(pins.every(item => item.catalogRevision === PIN_CATALOG_REVISION));
  assert.ok(!pins.some(item => /wings|departures|blank/i.test(item.id)));
  assert.deepEqual(normalizeCollection(result), result);
  const afterRemoval = result.filter(item => item.id !== PIN_DESIGNS[1].id);
  assert.deepEqual(normalizeCollection(afterRemoval), afterRemoval);
});

test('customized legacy pin is retained alongside the aviation examples', () => {
  const uploaded = { id: 'airarc-pin', type: 'pin', name: 'My pin', front: 'data:image/png;base64,own-art', back: null, finish: 'matte' };
  const result = normalizeCollection([uploaded]);
  assert.deepEqual(result[0], { ...uploaded, catalogRevision: PIN_CATALOG_REVISION });
  assert.equal(result.filter(item => item.type === 'pin').length, 8);
  assert.ok(result.some(item => item.id === 'airarc-pin-attitude'));
});

test('aviation migration never displaces uploads or exceeds the collection limit', () => {
  const full = Array.from({ length: MAX_PER_TYPE }, (_, index) => ({ id: `custom-${index}`, type: 'pin', front: `custom-art-${index}`, back: null }));
  const result = normalizeCollection(full).filter(item => item.type === 'pin');
  assert.equal(result.length, MAX_PER_TYPE);
  assert.deepEqual(result.map(item => item.front), full.map(item => item.front));
});

test('new postcard artwork refreshes saved defaults while preserving uploaded faces', () => {
  const saved = [
    { id: 'example', type: 'postcard', front: '/AIRARC/artwork/postcard-front.svg', back: '/artwork/postcard-back.svg?v=old' },
    { id: 'custom', type: 'postcard', front: 'data:image/png;base64,custom', back: 'data:image/png;base64,back' }
  ];
  const result = normalizeCollection(saved);
  assert.equal(result[0].front, PRODUCTS.postcard.front);
  assert.equal(result[0].back, PRODUCTS.postcard.back);
  assert.deepEqual(result[1], saved[1]);
  assert.deepEqual(normalizeCollection(result), result);
});
