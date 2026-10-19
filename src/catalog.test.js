import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCollection, PRODUCTS } from './catalog.js';

test('legacy uploads retain their artwork and become lanyards; new categories receive examples', () => {
  const legacy = { id: 'custom', name: 'Personal', front: 'data:image/png;base64,custom', back: 'data:image/png;base64,back', color: '#123456' };
  const migrated = normalizeCollection([legacy]);
  assert.deepEqual(migrated[0], { ...legacy, type: 'lanyard' });
  assert.deepEqual(migrated.map(item => item.type), ['lanyard', 'postcard', 'pin']);
  assert.equal(legacy.type, undefined);
});

test('migration is idempotent, including pins that have a physical back instead of artwork', () => {
  const first = normalizeCollection([{ id: 'my-pin', type: 'pin', front: 'custom-pin', back: null }]);
  assert.deepEqual(normalizeCollection(first), first);
  assert.equal(first.filter(item => item.type === 'pin').length, 1);
  assert.equal(first[0].back, null);
});

test('invalid records cannot leave a category without a usable object', () => {
  const result = normalizeCollection([null, {}, { id: 'missing-image' }]);
  assert.deepEqual(result.map(item => item.type), Object.keys(PRODUCTS));
  assert.ok(result.every(item => item.front && item.name));
});
