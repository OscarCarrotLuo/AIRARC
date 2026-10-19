import { useEffect, useRef, useState } from 'react';
import { Download, RotateCcw, FlipHorizontal2, X, Upload, Check, SlidersHorizontal, Trash2, Copy, LoaderCircle } from 'lucide-react';
import Lanyard from './components/Lanyard.jsx';
import PrintObject from './components/PrintObject.jsx';
import { PRODUCTS, MAX_PER_TYPE, exampleFor, normalizeCollection } from './catalog.js';
import { readArtwork, readCollection, saveCollection } from './storage.js';
import { publicAsset } from './assets.js';

const FRONT = PRODUCTS.lanyard.front, BACK = PRODUCTS.lanyard.back;
const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg';
const COLORS = [['#4d85c5', 'Blue'], ['#ffffff', 'White'], ['#213c5b', 'Navy'], ['#bfd4eb', 'Sky'], ['#7a91aa', 'Slate']];
const INITIAL = normalizeCollection([
  { id: 'studio-orange', name: 'AIRARC / 001', front: FRONT, back: BACK, color: '#4d85c5', finish: 'glossy', metal: 'silver', fit: 'cover', demo: true },
  { id: 'studio-black', name: 'AIRARC / 002', front: BACK, back: FRONT, color: '#ffffff', finish: 'matte', metal: 'silver', fit: 'cover', demo: true },
  { id: 'studio-sand', name: 'AIRARC / 003', front: FRONT, back: BACK, color: '#bfd4eb', finish: 'holographic', metal: 'silver', fit: 'cover', demo: true }
]);

function migrateBrand(saved) {
  const oldFront = '/artwork/studio-front.png', oldBack = '/artwork/studio-back.png';
  const defaultColors = { 'studio-orange': ['#ed5e13', '#4d85c5'], 'studio-black': ['#252525', '#ffffff'], 'studio-sand': ['#d2c4a6', '#bfd4eb'] };
  return saved.map(badge => {
    const next = { ...badge };
    for (const side of ['front', 'back']) {
      if (next[side] === oldFront) next[side] = FRONT;
      if (next[side] === oldBack) next[side] = BACK;
    }
    const colors = defaultColors[next.id];
    if (colors && next.demo && next.color === colors[0]) next.color = colors[1];
    if (/^Studio \/ 00[123]$/.test(next.name)) next.name = next.name.replace('Studio', 'AIRARC');
    return next;
  });
}

export default function App() {
  const [badges, setBadges] = useState(INITIAL), [selected, setSelected] = useState(INITIAL[0].id);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [inspector, setInspector] = useState(false), [commands, setCommands] = useState({}), [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);
  const saveQueue = useRef(Promise.resolve()), settingsButton = useRef(null), inspectorRef = useRef(null);
  const current = badges.find(b => b.id === selected) || badges[0];
  const type = current.type, product = PRODUCTS[type];
  const collection = badges.filter(item => item.type === type);
  const lastSelected = useRef({});
  useEffect(() => {
    let live = true;
    readCollection().then(saved => { if (live && Array.isArray(saved) && saved.length) { const migrated = normalizeCollection(migrateBrand(saved.filter(b => b && typeof b === 'object'))); setBadges(migrated); setSelected(migrated[0].id); } })
      .catch(() => { if (live) setToast('Could not load saved items.'); }).finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveCollection(badges));
    saveQueue.current.catch(() => { if (active) setToast('Could not save. Keep your original artwork.'); });
    return () => { active = false; };
  }, [badges, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { setDeleting(false); }, [selected, inspector]);
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape' && inspector) { setInspector(false); settingsButton.current?.focus(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.closest('.lanyard, .print-object')) return;
      if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'r') { e.preventDefault(); command(e.key.toLowerCase() === 'f' ? 'flip' : 'reset'); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [current.id, inspector]);
  useEffect(() => { if (inspector) inspectorRef.current?.querySelector('input')?.focus(); }, [inspector]);
  function update(values) { setBadges(prev => prev.map(b => b.id === current.id ? { ...b, ...values } : b)); }
  function command(type) { setCommands(prev => ({ ...prev, [current.id]: { type, sequence: (prev[current.id]?.sequence || 0) + 1 } })); }
  function select(id) { setSelected(id); const item = badges.find(b => b.id === id); if (item) lastSelected.current[item.type] = id; }
  function selectType(nextType) {
    lastSelected.current[type] = current.id;
    const next = badges.find(b => b.type === nextType && b.id === lastSelected.current[nextType]) || badges.find(b => b.type === nextType);
    if (next) { select(next.id); setInspector(false); }
  }
  async function upload(file, target = 'new') {
    if (!file || busy) return;
    if (target === 'new' && collection.length >= MAX_PER_TYPE) return setToast('Limit reached: 20 items per type.');
    const targetId = current.id;
    setBusy(true);
    try {
      const artwork = await readArtwork(file, target === 'strap' ? 'strap' : 'card');
      if (target === 'new') {
        const badge = { ...exampleFor(type), id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || `My ${product.label.toLowerCase()}`, front: artwork, demo: false };
        setBadges(prev => [...prev, badge]); setSelected(badge.id); setInspector(false); setToast(`${product.label} created`);
      } else setBadges(prev => prev.map(b => b.id === targetId ? { ...b, [target]: artwork } : b));
    } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }
  function duplicate() {
    if (collection.length >= MAX_PER_TYPE) return setToast('Limit reached: 20 items per type.');
    const copy = { ...current, id: crypto.randomUUID(), name: `${current.name.slice(0, 32)} copy`, demo: false };
    setBadges(prev => [...prev, copy]); setSelected(copy.id);
  }
  function remove() {
    if (!deleting) return setDeleting(true);
    const next = badges.filter(b => b.id !== current.id);
    setBadges(next); setSelected(next.find(b => b.type === type).id); setDeleting(false);
  }
  function closeSettings() { setInspector(false); settingsButton.current?.focus(); }

  return <div className="app">
    <header className="topbar">
      <a href={publicAsset('')} className="brand" aria-label="AIRARC home"><span className="brand-crop"><img src={publicAsset('brand/airarc-logo.png')} alt="AIRARC"/></span></a>
    </header>
    <main className="workspace">
      <div className={`stage ${type === 'lanyard' ? '' : 'print-stage'}`} aria-label="3D object display">
        <div key={current.id} className="badge-stage">
          {type === 'lanyard' ? <Lanyard frontImage={current.front} backImage={current.back} strapImage={current.strap} strapColor={current.color} finish={current.finish} metal={current.metal} imageFit={current.fit} size={0.54} strapLength={0.46} strapWidth={1.65} breeze={0.12} damping={0.5} elasticity={0.23} intro={false} command={commands[current.id]} label={current.name}/> : <PrintObject type={type} frontImage={current.front} backImage={current.back} imageFit={current.fit} finish={current.finish} metal={current.metal} command={commands[current.id]} label={current.name}/>}
        </div>
      </div>

      {inspector && <aside className="inspector" id="badge-settings" ref={inspectorRef} aria-label="Object settings">
        <div className="inspector-heading"><input aria-label="Object name" maxLength={40} value={current.name} onChange={e => update({ name: e.target.value })}/><button className="icon-button" aria-label="Close settings" title="Close settings" onClick={closeSettings}><X size={17}/></button></div>
        <div className="object-size">{product.size}</div>
        <div className="setting-group"><span className="setting-label">Finish</span><div className="options">{[['glossy', 'Gloss'], ['matte', 'Matte'], ['holographic', 'Foil']].map(([key, label]) => <button key={key} className={current.finish === key ? 'active' : ''} aria-pressed={current.finish === key} onClick={() => update({ finish: key })}>{label}</button>)}</div></div>
        {type === 'lanyard' && <div className="setting-group"><span className="setting-label">Strap</span><div className="color-options">{COLORS.map(([color, label]) => <button key={color} style={{ '--swatch': color }} className={current.color === color && !current.strap ? 'selected' : ''} aria-label={`Strap color: ${label}`} title={label} aria-pressed={current.color === color && !current.strap} onClick={() => update({ color, strap: null })}>{current.color === color && !current.strap && <Check size={12} color={['#ffffff', '#bfd4eb'].includes(color) ? '#213c5b' : '#ffffff'}/>}</button>)}</div></div>}
        {type !== 'postcard' && <div className="setting-group"><span className="setting-label">Metal</span><div className="options">{[['silver', 'Silver'], ['graphite', 'Gray'], ['gold', 'Gold']].map(([key, label]) => <button key={key} className={current.metal === key ? 'active' : ''} aria-label={`Metal: ${label}`} aria-pressed={current.metal === key} onClick={() => update({ metal: key })}>{label}</button>)}</div></div>}
        <div className="artwork-inputs">{[['front', 'Front'], ...(type !== 'pin' ? [['back', 'Back']] : []), ...(type === 'lanyard' ? [['strap', 'Strap']] : [])].map(([key, label]) => <label key={key} className={busy ? 'disabled' : ''} title={`Replace ${label.toLowerCase()} image`}><Upload size={13}/>{label}<input aria-label={`Replace ${label.toLowerCase()} image`} type="file" accept={ACCEPT} disabled={busy} onChange={e => { upload(e.target.files[0], key); e.target.value = ''; }}/></label>)}</div>
        <div className="inspector-bottom"><select aria-label="Image fit" value={current.fit} onChange={e => update({ fit: e.target.value })}><option value="cover">Fill</option><option value="contain">Fit</option></select><div><button className="icon-button" aria-label="Duplicate item" title="Duplicate item" disabled={!ready || busy || collection.length >= MAX_PER_TYPE} onClick={duplicate}><Copy size={16}/></button><button className={`icon-button ${deleting ? 'confirm-delete' : ''}`} disabled={collection.length < 2 || busy} aria-label={deleting ? 'Confirm delete' : 'Delete item'} title={deleting ? 'Click again to delete' : 'Delete item'} onClick={remove} onBlur={() => setDeleting(false)}>{deleting ? <Check size={16}/> : <Trash2 size={16}/>}</button></div></div>
      </aside>}

      <div className="bottom-dock">
      <div className="collection-strip" aria-label="Collection">{collection.map(b => <button key={b.id} className={`badge-thumb thumb-${b.type} ${b.id === current.id ? 'selected' : ''}`} aria-label={`Select ${b.name}`} title={b.name} aria-pressed={b.id === current.id} onClick={() => select(b.id)}>{type === 'lanyard' && <span className="mini-ribbon" style={{ background: b.color }}/>}<img src={b.front} alt=""/></button>)}</div>
      <div className="dock-controls">
        <div className="file-actions">
          <select className="product-select" aria-label="Object type" title={`${product.label} · ${product.size}`} value={type} disabled={!ready} onChange={e => selectType(e.target.value)}>{Object.entries(PRODUCTS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>
          <a className="icon-button" href={product.template} download aria-label={`Download ${product.label.toLowerCase()} templates`} title={`Download ${product.label.toLowerCase()} templates`}><Download size={18}/></a>
          <label className={`upload-button ${busy || !ready || collection.length >= MAX_PER_TYPE ? 'disabled' : ''}`} title={`Create ${product.label.toLowerCase()} from image`}>
            {busy ? <LoaderCircle size={18} className="spin"/> : <Upload size={18}/>}
            <input aria-label={`Upload ${product.label.toLowerCase()}`} type="file" accept={ACCEPT} disabled={busy || !ready || collection.length >= MAX_PER_TYPE} onChange={e => { upload(e.target.files[0]); e.target.value = ''; }}/>
          </label>
        </div>
      <div className="object-controls">
        <button className="icon-button" aria-label="Flip" title="Flip · F" onClick={() => command('flip')}><FlipHorizontal2 size={18}/></button>
        <button className="icon-button" aria-label="Reset" title="Reset · R" onClick={() => command('reset')}><RotateCcw size={18}/></button>
        <span className="control-divider"/>
        <button ref={settingsButton} className={`icon-button ${inspector ? 'active' : ''}`} aria-label="Settings" title="Settings" aria-controls="badge-settings" aria-expanded={inspector} onClick={() => setInspector(!inspector)}><SlidersHorizontal size={18}/></button>
      </div>
      </div>
      </div>
    </main>
    {toast && <div className="toast" role="status">{toast}<button className="icon-button" aria-label="Dismiss" onClick={() => setToast('')}><X size={14}/></button></div>}
  </div>;
}
