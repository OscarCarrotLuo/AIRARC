import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAsset, normalizeArtworkPath } from './assets.js';

test('GitHub project paths keep artwork and downloads inside the published site', () => {
  assert.equal(publicAsset('/artwork/airarc-front.svg', '/AIRARC/'), '/AIRARC/artwork/airarc-front.svg');
  assert.equal(publicAsset('templates/badge-templates.zip', '/AIRARC'), '/AIRARC/templates/badge-templates.zip');
  assert.equal(publicAsset('', '/AIRARC/'), '/AIRARC/');
  assert.equal(publicAsset('brand/airarc-logo.png', '/'), '/brand/airarc-logo.png');
});

test('stored built-in art follows the site base while uploaded and external images remain untouched', () => {
  assert.equal(normalizeArtworkPath('/artwork/airarc-back.svg', '/AIRARC/'), '/AIRARC/artwork/airarc-back.svg');
  for (const source of [null, 'data:image/webp;base64,custom', 'blob:https://example.com/asset', 'https://example.com/image.png', '/AIRARC/artwork/airarc-front.svg']) {
    assert.equal(normalizeArtworkPath(source, '/AIRARC/'), source);
  }
});
