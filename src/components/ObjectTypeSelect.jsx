import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PRODUCTS } from '../catalog.js';

const TYPES = Object.keys(PRODUCTS);

export default function ObjectTypeSelect({ value, onChange, disabled }) {
  const id = useId(), root = useRef(null), trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(TYPES.indexOf(value));

  useEffect(() => {
    if (!open) return;
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function show() { setActive(TYPES.indexOf(value)); setOpen(true); }
  function choose(index) {
    onChange(TYPES[index]);
    setOpen(false);
    trigger.current?.focus();
  }
  function onKeyDown(event) {
    const { key } = event;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
      event.preventDefault();
      if (!open) { show(); return; }
      if (key === 'Enter' || key === ' ') { choose(active); return; }
      setActive(index => key === 'Home' ? 0 : key === 'End' ? TYPES.length - 1 :
        (index + (key === 'ArrowDown' ? 1 : -1) + TYPES.length) % TYPES.length);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const start = open ? active : TYPES.indexOf(value);
      const index = TYPES.map((_, i) => (start + i + 1) % TYPES.length)
        .find(i => PRODUCTS[TYPES[i]].label.toLowerCase().startsWith(key.toLowerCase()));
      if (index !== undefined) { event.preventDefault(); setActive(index); setOpen(true); }
    }
  }

  return <div className="product-picker" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="product-select" type="button" role="combobox"
      aria-label="Object type" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-${active}` : undefined}
      title={`${PRODUCTS[value].label} · ${PRODUCTS[value].size}`} disabled={disabled}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown}>
      <span>{PRODUCTS[value].label}</span><ChevronDown size={13} aria-hidden="true"/>
    </button>
    {open && <div className="product-menu" id={`${id}-options`} role="listbox" aria-label="Object type">
      {TYPES.map((type, index) => <div key={type} id={`${id}-${index}`} role="option"
        aria-selected={value === type} className={`product-option ${active === index ? 'highlighted' : ''}`}
        onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()}
        onClick={() => choose(index)}>
        <span>{PRODUCTS[type].label}</span>{value === type && <Check size={13} aria-hidden="true"/>}
      </div>)}
    </div>}
  </div>;
}
