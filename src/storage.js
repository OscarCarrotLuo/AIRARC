const DB = 'badge-atelier-v1';
const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore('collection');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
export async function readCollection() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('collection');
    const req = tx.objectStore('collection').get('badges');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveCollection(badges) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('collection', 'readwrite');
    tx.objectStore('collection').put(badges, 'badges');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function readArtwork(file, kind = 'card') {
  if (!file) return null;
  if (file.size > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MB. Choose a smaller file.');
  if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name)) throw new Error('Use PNG, JPG, WebP or SVG. Export AI files as images first.');
  let blob = file;
  if (/\.svg$/i.test(file.name)) {
    const svg = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
    if (svg.querySelector('parsererror') || svg.documentElement.localName !== 'svg') throw new Error('Invalid SVG. Export it again.');
    const unsafe = svg.querySelector('script,foreignObject,iframe,object,embed,image,use,animate,animateTransform,set');
    if ([...svg.querySelectorAll('style')].some(el => /(?:@import|url\s*\()/i.test(el.textContent))) throw new Error('SVG uses external styles. Outline it or export PNG.');
    if (unsafe || [...svg.querySelectorAll('*')].some(el => [...el.attributes].some(a => !/^xmlns(?::|$)/.test(a.name) && (/^on/i.test(a.name) || /(?:https?:|file:|javascript:|@import|url\s*\()/i.test(a.value))))) {
      throw new Error('SVG contains unsupported content. Outline it or export PNG.');
    }
    blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Cannot read this image. Export it as PNG or JPG.')); img.src = url;
    });
    if (!image.width || !image.height || image.width * image.height > 100000000) throw new Error('Image dimensions are too large or invalid. Resize it below 8000 pixels.');
    if (kind === 'strap' && image.width < image.height * 2) throw new Error('Use a wide strap image: 900:20, or a horizontal repeat.');
    const scale = Math.min(1, (kind === 'strap' ? 4096 : 1712) / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.94);
  } finally { URL.revokeObjectURL(url); }
}
