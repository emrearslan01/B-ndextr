// ==========================================================================
// BINDEX — 3D showroom (Three.js r149, UMD global window.THREE) + configurator
//
// Scene: oak plank floor, warm plaster wall, pendant spot lamp with a soft
// volumetric beam, and a procedural Saffiano-leather clamshell case.
// The section is 400vh tall; its stage is sticky. Scroll progress p (0..1)
// rotates the case 360°, the user can drag to spin it, and the lamp switches on
// as the section pins.
// ==========================================================================

import { COLORS, PULLS, DEFAULT_SELECTION, SHOWROOM } from './config.js';
import { pinProgress } from './scroll-fx.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (_) { return false; }
}

function loadScript(src) {
  if (window.THREE) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

// --------------------------------------------------------------------------
// Configurator (UI) — works with or without WebGL
// --------------------------------------------------------------------------
function createConfigurator(section, onChange) {
  const state = { ...DEFAULT_SELECTION };
  const colorWrap = section.querySelector('[data-swatches="colors"]');
  const pullWrap = section.querySelector('[data-swatches="pulls"]');
  const colorName = section.querySelector('[data-bind="colorName"]');
  const pullName = section.querySelector('[data-bind="pullName"]');
  const live = section.querySelector('[data-bind="liveStatus"]');

  const makeButton = (item, kind) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bx3-swatch' + (kind === 'pull' ? ' bx3-swatch--pull' : '');
    b.dataset.id = item.id;
    b.setAttribute('aria-label', kind === 'pull' ? item.name + ' çekecek' : item.name);
    b.setAttribute('aria-pressed', 'false');
    const chip = document.createElement('span');
    chip.className = 'bx3-swatch__chip';
    chip.style.setProperty('--chip', item.swatch);
    b.appendChild(chip);
    b.addEventListener('click', () => {
      state[kind === 'pull' ? 'pull' : 'color'] = item.id;
      render(true);
    });
    return b;
  };

  // Arrow keys move focus within a swatch group (Tab still moves between groups)
  const roving = (wrap) => wrap.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    const btns = Array.from(wrap.querySelectorAll('button'));
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    btns[(i + keys[e.key] + btns.length) % btns.length].focus();
  });

  colorWrap.replaceChildren(...COLORS.map((c) => makeButton(c, 'color')));
  pullWrap.replaceChildren(...PULLS.map((p) => makeButton(p, 'pull')));
  roving(colorWrap); roving(pullWrap);

  function render(announce) {
    const c = COLORS.find((x) => x.id === state.color) || COLORS[0];
    const p = PULLS.find((x) => x.id === state.pull) || PULLS[0];
    colorWrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === c.id)));
    pullWrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === p.id)));
    colorName.textContent = c.name;
    pullName.textContent = p.name;
    if (announce && live) live.textContent = `Seçim: ${c.name}, ${p.name} çekecek`;
    onChange(c, p);
  }

  return { render, get state() { return state; } };
}

// --------------------------------------------------------------------------
// Procedural textures (generated on a 2D canvas)
// --------------------------------------------------------------------------
function saffianoBump(T) {
  const tc = document.createElement('canvas'); tc.width = tc.height = 512;
  const g = tc.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, l = 3 + Math.random() * 7, d = Math.random() < 0.5 ? 1 : -1;
    const v = Math.floor(70 + Math.random() * 120);
    g.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * d); g.stroke();
  }
  const bump = new T.CanvasTexture(tc);
  bump.wrapS = bump.wrapT = T.RepeatWrapping; bump.repeat.set(1.6, 1.6);
  return bump;
}

function oakFloor(T) {
  const wc = document.createElement('canvas'); wc.width = wc.height = 1024;
  const wg = wc.getContext('2d');
  const planks = 8, pw = 1024 / planks;
  const tones = [[184, 140, 96], [172, 128, 86], [194, 152, 106], [163, 121, 80], [178, 136, 92], [189, 146, 100]];
  for (let i = 0; i < planks; i++) {
    let y0 = -Math.random() * 600;
    while (y0 < 1024) {
      const len = 380 + Math.random() * 520;
      const tone = tones[Math.floor(Math.random() * tones.length)];
      const j = (Math.random() - 0.5) * 14;
      wg.fillStyle = 'rgb(' + Math.round(tone[0] + j) + ',' + Math.round(tone[1] + j) + ',' + Math.round(tone[2] + j) + ')';
      wg.fillRect(i * pw, y0, pw, len);
      // grain
      for (let k = 0; k < 26; k++) {
        const gx = i * pw + 6 + Math.random() * (pw - 12);
        const a = 0.04 + Math.random() * 0.08;
        wg.strokeStyle = Math.random() < 0.5 ? 'rgba(90,58,30,' + a + ')' : 'rgba(255,236,210,' + a * 0.8 + ')';
        wg.lineWidth = 0.6 + Math.random() * 1.6;
        wg.beginPath();
        wg.moveTo(gx, y0);
        const amp = 2 + Math.random() * 5, freq = 0.006 + Math.random() * 0.01, ph = Math.random() * 6;
        for (let yy = y0; yy <= y0 + len; yy += 12) wg.lineTo(gx + Math.sin(yy * freq + ph) * amp, yy);
        wg.stroke();
      }
      // knot, occasionally
      if (Math.random() < 0.25) {
        const kx = i * pw + 20 + Math.random() * (pw - 40), ky = y0 + Math.random() * len;
        const kg = wg.createRadialGradient(kx, ky, 0, kx, ky, 9);
        kg.addColorStop(0, 'rgba(92,60,32,0.45)'); kg.addColorStop(1, 'rgba(92,60,32,0)');
        wg.fillStyle = kg; wg.beginPath(); wg.ellipse(kx, ky, 6, 12, 0, 0, Math.PI * 2); wg.fill();
      }
      // end joint
      wg.fillStyle = 'rgba(70,45,22,0.55)'; wg.fillRect(i * pw, y0 + len - 1.5, pw, 1.5);
      y0 += len;
    }
    // seam between planks
    wg.fillStyle = 'rgba(64,40,20,0.6)'; wg.fillRect(i * pw, 0, 2, 1024);
  }
  const wood = new T.CanvasTexture(wc);
  wood.encoding = T.sRGBEncoding;
  wood.wrapS = wood.wrapT = T.RepeatWrapping;
  wood.repeat.set(9, 5);
  return wood;
}

function logoTexture(T) {
  const lc = document.createElement('canvas'); lc.width = 512; lc.height = 64;
  const lg = lc.getContext('2d');
  lg.fillStyle = 'rgba(255,255,255,0.9)'; lg.font = '700 34px Inter, -apple-system, sans-serif'; lg.textBaseline = 'middle';
  const word = 'BINDEX', sp = 16; let total = 0;
  for (const ch of word) total += lg.measureText(ch).width + sp;
  let x = (512 - total + sp) / 2;
  for (const ch of word) { lg.fillText(ch, x, 34); x += lg.measureText(ch).width + sp; }
  return new T.CanvasTexture(lc);
}

function contactShadowTexture(T) {
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d');
  const grd = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(40,24,10,0.55)'); grd.addColorStop(0.5, 'rgba(40,24,10,0.18)'); grd.addColorStop(1, 'rgba(40,24,10,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 256, 256);
  return new T.CanvasTexture(sc);
}

// --------------------------------------------------------------------------
// Procedural product model. Replace with a GLTF model via SHOWROOM.modelUrl
// (see README). Returns a Group centred on the origin, ~2.7 × 4.0 units.
// --------------------------------------------------------------------------
function rr(T, w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function buildCase(T, mats, bump) {
  const { leather, band, teeth, metal, pullMat } = mats;
  const slab = (w, h, r, depth, bev) => {
    const geo = new T.ExtrudeGeometry(rr(T, w - bev * 2, h - bev * 2, Math.max(r - bev, 0.02)), { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 28 });
    geo.center(); return geo;
  };

  const W = 2.7, H = 4.0, R = 0.3;
  const model = new T.Group();

  // clamshell halves
  const half = slab(W, H, R, 0.12, 0.07);
  const back = new T.Mesh(half, leather); back.position.z = -0.17; model.add(back);
  const front = new T.Mesh(half, leather); front.position.z = 0.17; model.add(front);
  // zipper tape
  const tapeGeo = new T.ExtrudeGeometry(rr(T, W - 0.05, H - 0.05, R - 0.02), { depth: 0.1, bevelEnabled: false, curveSegments: 28 });
  tapeGeo.center();
  model.add(new T.Mesh(tapeGeo, band));
  // zipper teeth
  const pts = rr(T, W - 0.035, H - 0.035, R - 0.015).getSpacedPoints(420).map((p) => new T.Vector3(p.x, p.y, 0));
  const curve = new T.CatmullRomCurve3(pts, true);
  model.add(new T.Mesh(new T.TubeGeometry(curve, 420, 0.026, 8, true), teeth));

  // laptop peeking out
  const laptop = new T.Mesh(slab(W - 0.46, H - 0.5, 0.2, 0.05, 0.018), metal);
  laptop.position.set(0, -0.06, 0.345); model.add(laptop);

  // front pocket
  const pH = H * 0.72;
  const pocket = new T.Mesh(slab(W - 0.2, pH, R - 0.06, 0.04, 0.03), leather);
  const pY = -H / 2 + 0.1 + pH / 2;
  pocket.position.set(0, pY, 0.445); model.add(pocket);

  // stitching
  const stitch = (w, h, r, y, z) => {
    const sp = rr(T, w, h, r).getSpacedPoints(360).map((p) => new T.Vector3(p.x, p.y + y, z));
    const geo = new T.BufferGeometry().setFromPoints(sp);
    const line = new T.LineLoop(geo, new T.LineDashedMaterial({ color: 0xffffff, dashSize: 0.045, gapSize: 0.035, transparent: true, opacity: 0.28 }));
    line.computeLineDistances(); model.add(line);
  };
  stitch(W - 0.38, pH - 0.18, R - 0.15, pY, 0.497);
  stitch(W - 0.3, H - 0.3, R - 0.12, 0, -0.305);

  // embossed logo
  const logo = new T.Mesh(new T.PlaneGeometry(1.2, 0.15), new T.MeshBasicMaterial({ map: logoTexture(T), transparent: true, opacity: 0.32, depthWrite: false }));
  logo.position.set(0, -H / 2 + 0.42, 0.498); model.add(logo);

  // zipper slider + pull (bottom-left corner)
  const slider = new T.Mesh(new T.BoxGeometry(0.1, 0.18, 0.13), teeth);
  slider.position.set(-W / 2 - 0.01, -H / 2 + 0.42, 0); model.add(slider);
  const tab = new T.Mesh(slab(0.16, 0.46, 0.06, 0.04, 0.015), pullMat);
  tab.rotation.y = Math.PI / 2; tab.position.set(-W / 2 - 0.07, -H / 2 + 0.16, 0); tab.rotation.z = 0.08;
  model.add(tab);

  model.traverse((o) => { if (o.isMesh && o !== logo) o.castShadow = true; });
  return model;
}

// --------------------------------------------------------------------------
// Scene
// --------------------------------------------------------------------------
async function createScene(canvas, section) {
  const T = window.THREE;
  const lin = (hex) => new T.Color(hex).convertSRGBToLinear();
  const mobileGPU = Math.min(window.innerWidth, window.innerHeight) < 700 || window.innerWidth < 700;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0xEDE4D5, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.fog = new T.Fog(lin(0xE9DFCF), 16, 46);
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 120);

  // --- studio environment (soft boxes) for realistic reflections
  const pm = new T.PMREMGenerator(renderer);
  const env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: new T.Color(0.35, 0.34, 0.33), side: T.BackSide })));
  const soft = (w, h, c, x, y, z, rx, ry) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
  };
  soft(12, 6, new T.Color(6, 6, 6), 0, 9, 3, Math.PI / 2, 0);
  soft(5, 9, new T.Color(4, 4, 4), -10, 2, 4, 0, Math.PI / 2);
  soft(5, 9, new T.Color(2.4, 2.2, 2.0), 10, 1, -2, 0, -Math.PI / 2);
  soft(10, 3, new T.Color(1.6, 1.6, 1.6), 0, -1, 12, 0, 0);
  scene.environment = pm.fromScene(env, 0.04).texture;
  pm.dispose();
  env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });

  // pendant spotlight (position set in resize so the lamp sits at the top of the frame)
  const SPOT_ANGLE = 0.36;
  const spot = new T.SpotLight(0xFFE9CC, 0, 60, SPOT_ANGLE, 0.62, 1.0);
  spot.castShadow = true;
  const sm = mobileGPU ? SHOWROOM.shadowMapMobile : SHOWROOM.shadowMapDesktop;
  spot.shadow.mapSize.set(sm, sm);
  spot.shadow.bias = -0.0005;
  spot.shadow.normalBias = 0.02;
  spot.shadow.camera.near = 1; spot.shadow.camera.far = 30;
  scene.add(spot); scene.add(spot.target);
  const fill = new T.DirectionalLight(0xFFF2E0, 0.42); fill.position.set(4, 3, 10); scene.add(fill);
  const rim = new T.DirectionalLight(0xFFFFFF, 0.35); rim.position.set(-6, 4, -6); scene.add(rim);
  const amb = new T.HemisphereLight(0xFFF8EE, 0x8A6A48, 0.42); scene.add(amb);

  await nextFrame(); // split heavy texture generation across frames
  const bump = saffianoBump(T);

  const mats = {
    leather: new T.MeshPhysicalMaterial({ envMapIntensity: 0.6, color: lin(0x1E1E20), roughness: 0.58, metalness: 0, bumpMap: bump, bumpScale: 0.012, clearcoat: 0.25, clearcoatRoughness: 0.45, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new T.Color(0.25, 0.25, 0.25) }),
    band: new T.MeshStandardMaterial({ envMapIntensity: 0.5, color: lin(0x111112), roughness: 0.92, metalness: 0 }),
    teeth: new T.MeshStandardMaterial({ envMapIntensity: 0.9, color: lin(0x2A2A2C), roughness: 0.35, metalness: 0.8 }),
    metal: new T.MeshStandardMaterial({ envMapIntensity: 1.0, color: lin(0xD9DADC), roughness: 0.26, metalness: 1 }),
    pullMat: new T.MeshStandardMaterial({ envMapIntensity: 0.9, color: lin(0xE9B21B), roughness: 0.32, metalness: 0.35 })
  };

  const spin = new T.Group();
  const model = buildCase(T, mats, bump);
  model.position.y = 0.1;
  spin.add(model);
  scene.add(spin);

  const FLOOR_Y = -2.3;

  await nextFrame();
  // --- oak plank floor (procedural texture)
  const wood = oakFloor(T);
  wood.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = new T.Mesh(new T.PlaneGeometry(70, 70), new T.MeshStandardMaterial({ map: wood, roughness: 0.48, metalness: 0, envMapIntensity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR_Y, 8); floor.receiveShadow = true;
  scene.add(floor);

  // --- warm plaster back wall
  const wall = new T.Mesh(new T.PlaneGeometry(90, 40), new T.MeshStandardMaterial({ color: lin(0xEEE4D4), roughness: 0.96, metalness: 0, envMapIntensity: 0.2 }));
  wall.position.set(0, FLOOR_Y + 20, -9); wall.receiveShadow = true; scene.add(wall);
  // skirting board
  const skirt = new T.Mesh(new T.BoxGeometry(90, 0.32, 0.06), new T.MeshStandardMaterial({ color: lin(0xE6DACA), roughness: 0.8 }));
  skirt.position.set(0, FLOOR_Y + 0.16, -8.97); scene.add(skirt);

  // --- pendant lamp
  const lamp = new T.Group();
  const black = new T.MeshStandardMaterial({ color: lin(0x18181A), roughness: 0.38, metalness: 0.65, side: T.DoubleSide });
  const shade = new T.Mesh(new T.CylinderGeometry(0.22, 0.62, 0.7, 64, 1, true), black);
  shade.position.y = 0.35; lamp.add(shade);
  const cap = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.06, 48), black); cap.position.y = 0.72; lamp.add(cap);
  const cord = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 20, 8), black); cord.position.y = 10.7; lamp.add(cord);
  const bulb = new T.Mesh(new T.CircleGeometry(0.56, 64), new T.MeshBasicMaterial({ color: new T.Color(3.2, 2.9, 2.5), fog: false }));
  bulb.rotation.x = Math.PI / 2; bulb.position.y = 0.02; lamp.add(bulb);
  scene.add(lamp);

  // --- volumetric light beam (soft additive cone)
  const beamMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new T.Color(1.0, 0.93, 0.82) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float h = vUv.y; float fade = pow(h, 1.6); float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float a = fade * edge * uOpacity * 0.22; gl_FragColor = vec4(uColor * a, a); }'
  });
  const beamGeo = new T.CylinderGeometry(0.5, 1, 1, 96, 1, true);
  beamGeo.translate(0, -0.5, 0);
  const beam = new T.Mesh(beamGeo, beamMat);
  beam.renderOrder = 5;
  scene.add(beam);

  // contact shadow
  const shadow = new T.Mesh(new T.PlaneGeometry(4.2, 1.4), new T.MeshBasicMaterial({ map: contactShadowTexture(T), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = FLOOR_Y + 0.005; shadow.renderOrder = 2; scene.add(shadow);

  // ---- state
  const t = {
    lightLevel: 0, raf: 0, running: false, visible: false,
    yaw: -0.6, pitch: 0.12, dragYaw: 0, dragPitch: 0, vel: 0, dragging: false,
    start: performance.now(),
    target: { leather: lin(0x1E1E20), band: lin(0x111112), pull: lin(0xE9B21B) }
  };
  const cleanup = [];

  // ---- sizing
  const resize = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    // cap pixel ratio (≤2) and total pixel budget (~4K) so fair TVs stay smooth
    const budget = Math.sqrt(8.3e6 / (w * h));
    renderer.setPixelRatio(Math.max(0.75, Math.min(window.devicePixelRatio || 1, SHOWROOM.maxPixelRatio, budget)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const mobile = camera.aspect < 0.9;
    const fit = 2 * Math.tan((camera.fov * Math.PI) / 360);
    // keep the product a comfortable size on any screen
    const d = Math.max(8.4 / fit, (mobile ? 4.4 : 5.2) / (fit * camera.aspect));
    const hv = (d * fit) / 2;
    // lift the product above the bottom UI (more on phones)
    const ty = 0.1 - (mobile ? 0.26 : 0.1) * hv;
    camera.position.set(0, ty + d * 0.07, d);
    camera.lookAt(0, ty, 0);
    camera.updateProjectionMatrix();
    // pendant lamp hangs near the top edge of the frame
    const lampY = ty + hv * (mobile ? 0.9 : 0.86) - 0.4;
    lamp.position.set(0, lampY, 0);
    spot.position.set(0, lampY, 0);
    spot.target.position.set(0, FLOOR_Y, 0);
    const bh = lampY - FLOOR_Y;
    const g2 = new T.CylinderGeometry(0.52, 0.52 + bh * Math.tan(SPOT_ANGLE) * 0.95, bh, 96, 1, true);
    g2.translate(0, -bh / 2, 0);
    beam.geometry.dispose(); beam.geometry = g2;
    beam.position.set(0, lampY, 0);
    if (!t.running) renderer.render(scene, camera);
  };
  resize();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement);
    cleanup.push(() => ro.disconnect());
  } else {
    window.addEventListener('resize', resize);
    cleanup.push(() => window.removeEventListener('resize', resize));
  }

  // ---- drag to rotate (touch: horizontal only — vertical swipes keep scrolling the page)
  let lastX = 0, lastY = 0, pointerType = 'mouse';
  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    t.dragging = true; pointerType = e.pointerType; lastX = e.clientX; lastY = e.clientY; t.vel = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  };
  const move = (e) => {
    if (!t.dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    t.dragYaw += dx * 0.009; t.vel = dx * 0.009;
    if (pointerType !== 'touch') t.dragPitch = Math.max(-0.35, Math.min(0.45, t.dragPitch + dy * 0.004));
    start();
  };
  const up = () => { t.dragging = false; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  cleanup.push(() => {
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('lostpointercapture', up);
  });

  // ---- render loop (runs only while the stage is on screen and the tab is visible)
  const tmp = new T.Color();
  const frame = () => {
    t.raf = requestAnimationFrame(frame);
    const calm = reducedMotion();
    const p = pinProgress(section);
    if (!t.dragging) { t.dragYaw += t.vel; t.vel *= 0.94; t.dragPitch *= 0.96; }
    const targetYaw = -0.75 + p * Math.PI * 2 + t.dragYaw;
    const targetPitch = 0.14 - 0.08 * Math.sin(p * Math.PI) + t.dragPitch;
    t.yaw += (targetYaw - t.yaw) * 0.09;
    t.pitch += (targetPitch - t.pitch) * 0.09;
    const time = (performance.now() - t.start) / 1000;
    spin.rotation.set(t.pitch, t.yaw, 0);
    model.position.y = calm ? 0.1 : 0.1 + Math.sin(time * 1.2) * 0.04;
    const s = 0.9 + 0.1 * Math.sin(p * Math.PI);
    spin.scale.setScalar(s);
    shadow.scale.set(s * (0.9 + 0.1 * Math.abs(Math.cos(t.yaw))), 1, s);
    // lights switch on as the section pins
    const want = Math.min(1, p / 0.08 + 0.12);
    t.lightLevel += (want - t.lightLevel) * (calm ? 1 : 0.08);
    spot.intensity = 4.2 * t.lightLevel;
    beamMat.uniforms.uOpacity.value = t.lightLevel;
    bulb.material.color.setRGB(0.6 + 2.6 * t.lightLevel, 0.55 + 2.35 * t.lightLevel, 0.5 + 2.0 * t.lightLevel);
    // smooth color transitions
    mats.leather.color.lerp(tmp.copy(t.target.leather), 0.12);
    mats.band.color.lerp(tmp.copy(t.target.band), 0.12);
    mats.pullMat.color.lerp(tmp.copy(t.target.pull), 0.12);
    renderer.render(scene, camera);
  };
  function start() {
    if (t.running || !t.visible || document.hidden) return;
    t.running = true; t.raf = requestAnimationFrame(frame);
  }
  function stop() {
    t.running = false; cancelAnimationFrame(t.raf);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      t.visible = es[0].isIntersecting;
      t.visible ? start() : stop();
    });
    io.observe(canvas);
    cleanup.push(() => io.disconnect());
  } else {
    t.visible = true;
  }
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  cleanup.push(() => document.removeEventListener('visibilitychange', onVis));

  // WebGL context loss (e.g. GPU reset on a fair kiosk): stop cleanly
  const onLost = (e) => { e.preventDefault(); stop(); };
  canvas.addEventListener('webglcontextlost', onLost);
  cleanup.push(() => canvas.removeEventListener('webglcontextlost', onLost));

  return {
    setColors(color, pull, immediate) {
      t.target = { leather: lin(color.leather), band: lin(color.band), pull: lin(pull.hex) };
      if (immediate) {
        mats.leather.color.copy(t.target.leather);
        mats.band.color.copy(t.target.band);
        mats.pullMat.color.copy(t.target.pull);
      }
      start();
    },
    start,
    destroy() { stop(); cleanup.forEach((f) => f()); renderer.dispose(); }
  };
}

// --------------------------------------------------------------------------
// Public entry
// --------------------------------------------------------------------------
export function initShowroom(section) {
  if (!section) return;
  const stage = section.querySelector('.bx3-stage');
  const canvas = section.querySelector('.bx3-canvas');
  const fallback = section.querySelector('.bx3-fallback');
  let scene = null;
  let current = null;

  const showFallback = () => {
    stage.classList.add('bx3--fallback');
    fallback.hidden = false;
    canvas.setAttribute('aria-hidden', 'true');
    if (current) fallback.style.setProperty('--fx-pos', current.color.photoX + '%');
  };

  const configurator = createConfigurator(section, (color, pull) => {
    const first = !current;
    current = { color, pull };
    canvas.setAttribute('aria-label', `Spot ışığı altında dönen 3D BINDEX organizer, ${color.name} renk, ahşap zemin üzerinde`);
    fallback.style.setProperty('--fx-pos', color.photoX + '%');
    if (scene) scene.setColors(color, pull, first);
  });
  configurator.render(false);

  if (!hasWebGL()) { showFallback(); return; }

  // Load Three.js and build the scene only when the visitor approaches the section.
  let started = false;
  const boot = async () => {
    if (started) return; started = true;
    try {
      await loadScript(SHOWROOM.threeSrc);
      scene = await createScene(canvas, section);
      scene.setColors(current.color, current.pull, true);
    } catch (e) {
      console.warn('BINDEX 3D init failed, showing photo fallback', e);
      showFallback();
    }
  };

  // Wait for the first scroll/interaction so the ~600 KB library never competes with the
  // initial page load, then boot as soon as the section is within ~1.5 viewports.
  if ('IntersectionObserver' in window) {
    let near = false, engaged = false;
    const tryBoot = () => { if (near && engaged) { io.disconnect(); boot(); } };
    const engage = () => {
      engaged = true;
      ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach((t) => window.removeEventListener(t, engage));
      tryBoot();
    };
    ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach((t) => window.addEventListener(t, engage, { passive: true }));
    const io = new IntersectionObserver((es) => {
      near = es.some((e) => e.isIntersecting);
      tryBoot();
    }, { rootMargin: '150% 0px 150% 0px' });
    io.observe(section);
  } else {
    boot();
  }
}
