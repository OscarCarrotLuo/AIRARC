import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildEnvironment, buildGrainTexture, buildShadowTexture } from './Lanyard.jsx';

const metalColor = metal => ({ silver: '#c9cdd2', graphite: '#515b68', gold: '#cba562' }[metal] || '#c9cdd2');

function domeGeometry(radius) {
  const rings = 48, segments = 128, positions = [], uvs = [], indices = [];
  for (let ring = 0; ring <= rings; ring++) {
    const r = radius * ring / rings;
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2, x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      positions.push(x, y, 0.12 * Math.sqrt(Math.max(0, 1 - (r / radius) ** 8)) - 0.02);
      uvs.push(x / (radius * 2) + 0.5, y / (radius * 2) + 0.5);
      if (ring < rings && i < segments) {
        const a = ring * (segments + 1) + i, b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function paperCurve(x, y, width, height) {
  return 0.026 * (x / (width / 2)) ** 2 + 0.012 * (y / (height / 2)) ** 2;
}

function curvePaper(geometry, width, height) {
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) points.setZ(i, points.getZ(i) + paperCurve(points.getX(i), points.getY(i), width, height));
  points.needsUpdate = true; geometry.computeVertexNormals(); return geometry;
}

export default function PrintObject({ type, frontImage, backImage, imageFit = 'cover', finish = 'matte', metal = 'silver', command, label }) {
  const root = useRef(null), api = useRef(null), latest = useRef(null);
  const [failed, setFailed] = useState(false), [imageFailed, setImageFailed] = useState(false);
  latest.current = { frontImage, backImage, imageFit, finish, metal };
  useEffect(() => { api.current?.apply(); }, [frontImage, backImage, imageFit, finish, metal]);
  useEffect(() => { if (command) api.current?.command(command.type); }, [command]);

  useEffect(() => {
    const container = root.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); }
    catch { setFailed(true); return; }
    let alive = true, raf = 0, previous = 0, visible = true;
    const canvas = renderer.domElement;
    canvas.className = 'lanyard-canvas'; canvas.setAttribute('aria-hidden', 'true');
    canvas.style.touchAction = 'none'; container.appendChild(canvas);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const environment = buildEnvironment(renderer); scene.environment = environment.texture;
    const light = new THREE.DirectionalLight('#ffffff', 2.3); light.position.set(-3, 4, 6);
    const fill = new THREE.DirectionalLight('#dceaff', 0.65); fill.position.set(4, -1, 5);
    scene.add(light, fill);
    const object = new THREE.Group(); object.rotation.order = 'YXZ'; scene.add(object);
    const isPin = type === 'pin', width = isPin ? 2.7 : 3.8, height = isPin ? 2.7 : 3.8 * 105 / 148;
    const materials = new Set(), geometries = new Set(), textures = new Set();
    const material = settings => { const value = new THREE.MeshPhysicalMaterial(settings); materials.add(value); return value; };
    const mesh = (geometry, surface, parent = object) => { geometries.add(geometry); const value = new THREE.Mesh(geometry, surface); parent.add(value); return value; };
    const grain = buildGrainTexture(); textures.add(grain); grain.repeat.set(isPin ? 4 : 9, isPin ? 4 : 6);
    const faces = ['front', 'back'].map(() => {
      const art = document.createElement('canvas'); art.width = isPin ? 1200 : 1776; art.height = isPin ? 1200 : 1260;
      const context = art.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, art.width, art.height);
      const texture = new THREE.CanvasTexture(art); texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.add(texture);
      return { canvas: art, texture, image: null, source: null, failed: false };
    });
    const front = material({ map: faces[0].texture, normalMap: grain, normalScale: new THREE.Vector2(0.025, 0.025), envMapIntensity: 0.6 });
    const back = material({ map: faces[1].texture, roughness: 0.94, normalMap: grain, normalScale: new THREE.Vector2(0.05, 0.05) });
    const metalMaterial = material({ color: metalColor(latest.current.metal), metalness: 1, roughness: 0.26, envMapIntensity: 0.85 });
    const brushed = material({ color: '#bfc4ca', metalness: 0.95, roughness: 0.39, normalMap: grain, normalScale: new THREE.Vector2(0.035, 0.012), envMapIntensity: 0.9 });
    if (isPin) {
      mesh(domeGeometry(width / 2), front);
      const shell = mesh(new THREE.CylinderGeometry(1.342, 1.342, 0.095, 128), metalMaterial);
      shell.rotation.x = Math.PI / 2; shell.position.z = -0.069;
      const rolledEdge = mesh(new THREE.TorusGeometry(1.302, 0.043, 16, 128), metalMaterial); rolledEdge.position.z = -0.11;
      const rear = mesh(new THREE.CircleGeometry(1.267, 128), brushed); rear.rotation.y = Math.PI; rear.position.z = -0.119;
      const innerRing = mesh(new THREE.TorusGeometry(1.16, 0.012, 10, 128), brushed); innerRing.position.z = -0.132;
      const needlePoints = [new THREE.Vector3(-0.72, 0, -0.225), new THREE.Vector3(0.61, 0, -0.225)];
      mesh(new THREE.TubeGeometry(new THREE.LineCurve3(...needlePoints), 1, 0.018, 12, false), metalMaterial);
      const coilPoints = [];
      for (let i = 0; i <= 96; i++) { const t = i / 96; coilPoints.push(new THREE.Vector3(-0.68 + t * 0.18, Math.cos(t * Math.PI * 8) * 0.06, -0.2 + Math.sin(t * Math.PI * 8) * 0.06)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints), 96, 0.014, 8, false), metalMaterial);
      for (const x of [-0.73, 0.7]) {
        const foot = mesh(new THREE.BoxGeometry(0.15, 0.24, 0.04), brushed); foot.position.set(x, 0, -0.15);
      }
      const catchCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.7, -0.08, -0.17), new THREE.Vector3(0.7, 0.025, -0.25), new THREE.Vector3(0.61, 0.07, -0.25), new THREE.Vector3(0.6, 0.02, -0.21)]);
      mesh(new THREE.TubeGeometry(catchCurve, 24, 0.026, 12, false), metalMaterial);
    } else {
      const edge = material({ color: '#e2dfd6', roughness: 1, normalMap: grain, normalScale: new THREE.Vector2(0.09, 0.09) });
      mesh(curvePaper(new THREE.BoxGeometry(width, height, 0.014, 64, 44, 1), width, height), edge);
      const face = mesh(curvePaper(new THREE.PlaneGeometry(width, height, 64, 44), width, height), front); face.position.z = 0.0076;
      const rearGeometry = new THREE.PlaneGeometry(width, height, 64, 44);
      rearGeometry.rotateY(Math.PI); curvePaper(rearGeometry, width, height);
      const rear = mesh(rearGeometry, back); rear.position.z = -0.0076;
    }
    const shadowTexture = buildShadowTexture(); textures.add(shadowTexture);
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.22, depthWrite: false }); materials.add(shadowMaterial);
    const shadow = mesh(new THREE.PlaneGeometry(width * 1.35, 0.6), shadowMaterial, scene);
    shadow.position.set(0, -height / 2 - 0.53, -0.6);
    const target = { x: -0.09, y: -0.12, z: isPin ? 0 : -0.045 }, velocity = { x: 0, y: 0 };
    object.rotation.set(target.x, target.y, target.z, 'YXZ'); object.position.y = 0.14;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let drag = null, hovered = false;

    function paint(face) {
      const { canvas: art, image } = face, ctx = art.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, art.width, art.height);
      if (image) {
        const scale = (latest.current.imageFit === 'contain' ? Math.min : Math.max)(art.width / image.width, art.height / image.height);
        ctx.drawImage(image, (art.width - image.width * scale) / 2, (art.height - image.height * scale) / 2, image.width * scale, image.height * scale);
      }
      face.texture.needsUpdate = true; draw(); start();
    }
    function load(face, source) {
      if (face.source === source) { paint(face); return; }
      face.source = source; face.image = null; face.failed = false; paint(face);
      if (!source) return;
      const image = new Image();
      image.onload = () => { if (!alive || face.source !== source) return; face.image = image; face.failed = false; setImageFailed(faces.some(f => f.failed)); paint(face); };
      image.onerror = () => { if (!alive || face.source !== source) return; face.failed = true; setImageFailed(true); };
      image.src = source;
    }
    function apply() {
      const settings = latest.current, matte = settings.finish === 'matte', foil = settings.finish === 'holographic';
      front.roughness = matte ? 0.86 : (isPin ? 0.24 : 0.38);
      front.clearcoat = matte ? 0 : 1; front.clearcoatRoughness = isPin ? 0.11 : 0.18;
      front.iridescence = foil ? 0.7 : 0; front.iridescenceIOR = 1.45; front.iridescenceThicknessRange = [180, 420];
      front.normalScale.setScalar(matte ? 0.045 : 0.012); front.needsUpdate = true;
      metalMaterial.color.set(metalColor(settings.metal)); brushed.color.set(metalColor(settings.metal));
      load(faces[0], settings.frontImage); if (!isPin) load(faces[1], settings.backImage);
      start();
    }
    function act(action) {
      velocity.x = velocity.y = 0;
      if (action === 'flip') { target.y = Math.round(target.y / Math.PI) * Math.PI + Math.PI; target.x = -0.09; }
      else if (action === 'reset') { target.x = -0.09; target.y = -0.12; target.z = isPin ? 0 : -0.045; }
      if (!visible || document.hidden) { object.rotation.set(target.x, target.y, target.z, 'YXZ'); draw(); }
      start();
    }
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    function hit(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera); return raycaster.intersectObjects(object.children).length > 0;
    }
    function down(event) {
      if (event.button !== 0 || drag || !hit(event)) return;
      container.focus({ preventScroll: true });
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY, time: performance.now(), start: performance.now(), moved: false };
      velocity.x = velocity.y = 0; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing'; start();
    }
    function move(event) {
      if (!drag) { hovered = hit(event); canvas.style.cursor = hovered ? 'grab' : ''; return; }
      if (drag.id !== event.pointerId) return;
      const now = performance.now(), dt = Math.max(0.008, Math.min(0.08, (now - drag.time) / 1000));
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) > 5) drag.moved = true;
      if (drag.moved) {
        target.y += dx * 0.009; target.x = THREE.MathUtils.clamp(target.x + dy * 0.007, -1.15, 1.15);
        velocity.y = THREE.MathUtils.clamp(dx * 0.009 / dt, -5, 5); velocity.x = THREE.MathUtils.clamp(dy * 0.007 / dt, -2, 2);
      }
      drag.x = event.clientX; drag.y = event.clientY; drag.time = now; start();
    }
    function up(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const pressed = drag; drag = null;
      if (event.type === 'pointerup' && !pressed.moved && performance.now() - pressed.start < 450) act('flip');
      else if (event.type !== 'pointerup' || performance.now() - pressed.time > 80) velocity.x = velocity.y = 0;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = hovered ? 'grab' : ''; start();
    }
    function key(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const name = event.key.toLowerCase();
      if (name === 'f' || name === 'r' || name === 'enter' || name === ' ') { event.preventDefault(); act(name === 'r' ? 'reset' : 'flip'); }
      else if (name.startsWith('arrow')) { event.preventDefault(); target.y += name === 'arrowleft' ? -0.2 : name === 'arrowright' ? 0.2 : 0; target.x = THREE.MathUtils.clamp(target.x + (name === 'arrowup' ? -0.15 : name === 'arrowdown' ? 0.15 : 0), -1.15, 1.15); start(); }
    }
    function frame(now) {
      raf = 0; if (!alive || !visible || document.hidden) return;
      const dt = Math.min(0.04, (now - (previous || now - 16)) / 1000); previous = now;
      if (reduceMotion.matches) velocity.x = velocity.y = 0;
      if (!drag && !reduceMotion.matches) {
        target.y += velocity.y * dt; target.x = THREE.MathUtils.clamp(target.x + velocity.x * dt, -1.15, 1.15);
        velocity.x *= Math.exp(-6 * dt); velocity.y *= Math.exp(-4.5 * dt);
      }
      const ease = reduceMotion.matches ? 1 : 1 - Math.exp(-(drag ? 24 : 11) * dt);
      object.rotation.x += (target.x - object.rotation.x) * ease;
      object.rotation.y += (target.y - object.rotation.y) * ease;
      object.rotation.z += (target.z - object.rotation.z) * ease;
      shadow.scale.x = 0.75 + 0.25 * Math.abs(Math.cos(object.rotation.y));
      draw();
      if (drag || Math.abs(target.x - object.rotation.x) + Math.abs(target.y - object.rotation.y) > 0.0001 || Math.abs(velocity.x) + Math.abs(velocity.y) > 0.001) start();
    }
    function draw() {
      renderer.render(scene, camera);
      container.dataset.side = Math.cos(object.rotation.y) >= 0 ? 'front' : 'back';
      container.dataset.motion = Math.abs(target.y - object.rotation.y) + Math.abs(target.x - object.rotation.x) < 0.001 ? 'idle' : 'moving';
    }
    function start() { if (alive && visible && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
    function resize() {
      const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = Math.max((height + 1.25) / 0.88, width / camera.aspect / 0.82) / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
      camera.updateProjectionMatrix(); draw(); start();
    }
    function visibility() { previous = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); }
    function contextLost(event) { event.preventDefault(); cancelAnimationFrame(raf); raf = 0; setFailed(true); }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { previous = 0; start(); } }); intersection.observe(container);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('webglcontextlost', contextLost); container.addEventListener('keydown', key); document.addEventListener('visibilitychange', visibility);
    api.current = { apply, command: act }; apply(); resize();
    return () => {
      alive = false; cancelAnimationFrame(raf); api.current = null;
      resizeObserver.disconnect(); intersection.disconnect();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('lostpointercapture', up); canvas.removeEventListener('webglcontextlost', contextLost);
      container.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); renderer.dispose(); canvas.remove();
    };
  }, [type]);

  return <div ref={root} className={`print-object ${type}`} tabIndex={0} role="group" aria-label={`${label}: drag to rotate, click or press F to flip, R to reset`}>
    {failed && <div className="webgl-fallback"><img src={frontImage} alt={label}/><p>3D is unavailable. Enable hardware acceleration and reload.</p></div>}
    {!failed && imageFailed && <p className="artwork-error" role="status">Image unavailable. Upload it again in Settings.</p>}
  </div>;
}
