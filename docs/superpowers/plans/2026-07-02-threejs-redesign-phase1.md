# three.js Redesign — Phase 1 (Foundation + Homepage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark "Liquid Glass" re-skin on `index.html` with a scroll-driven three.js wordmark experience (technique/quality-bar reference: `/home/x/Projects/form-3d`), built as a no-build CDN-ESM layer, without regressing SEO crawlability, the WCAG AA pass, or any conversion-funnel markup.

**Architecture:** A fixed-position `<canvas>` renders an extruded "OADIO" wordmark behind the existing homepage DOM (nav, receipt calculator, service cards, footer — all untouched, still real HTML). A capability check (`js/3d/fallback.js`) decides one of three modes before anything heavy loads: `full` (three.js + GSAP ScrollTrigger scrub + Lenis smooth scroll), `reduced` (three.js renders but motion is discrete IntersectionObserver-triggered, no Lenis, no continuous scrub), or `poster` (three.js module is never imported; a static SVG takes the canvas's place). A new override stylesheet (`css/scene.css`) repaints the existing cream `style.css` to a dark palette, mirroring how `css/glass.css` did it — `style.css` still provides all layout.

**Tech Stack:** three.js r185, GSAP 3.15.0 + ScrollTrigger, Lenis 1.3.25 — loaded via `<script type="importmap">` from jsDelivr, zero bundler. opentype.js 2.0.0 for one-time offline font conversion only (never shipped, never runs at request time).

## Global Constraints

- **No build step.** `wrangler.toml` (`pages_build_output_dir = "."`) and `deploy.sh` are not modified. No `package.json`/`node_modules` is committed or left in the repo root. Any temporary npm install (font tooling) is removed before the task is considered done.
- **Exact pinned CDN URLs** (verified against the real package files, not guessed):
  - `three` → `https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js`
  - `three/addons/` → `https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/`
  - `gsap` → `https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js`
  - `gsap/ScrollTrigger` → `https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js`
  - `lenis` → `https://cdn.jsdelivr.net/npm/lenis@1.3.25/dist/lenis.mjs`
- **Brand typography is unchanged**: Fraunces (display), Hanken Grotesk (body), Spline Sans Mono (mono) stay as-is everywhere in the DOM. The single exception is the extruded 3D wordmark mesh itself, which uses **Archivo Black** (the same face form-3d already proved extrudes/bevels cleanly) — this is a mesh-geometry decision, not a brand typography change.
- **Dark palette reuses `css/glass.css`'s existing token values** (`--paper:#090a0f`, `--ink:#f5f5f7`, `--amber:#ff5c26`, `--amber-2:#ff7647`, `--gold:#ffbe4b`, `--teal:#2dd4bf`, `--teal-2:#4dedd5`, `--booth:#06070a`, `--line`/`--line-2`) — these already cleared the WCAG AA contrast pass, so Phase 1 does not invent new colors.
- **Testing pattern for this plan:** logic with no DOM/WebGL dependency (capability detection, responsive layout math, scatter-target math) gets real unit tests via Node's built-in test runner (`node --test`, Node ≥18, zero new dependency). Modules that touch `three`/GSAP/DOM get `node --check <file>` for syntax validation (import resolution can't be checked outside a browser with the import map) plus an explicit manual browser verification checklist — this repo has no browser-automation harness and adding one is out of scope for Phase 1.
- **Content, links, prices, and JSON-LD schema never exist only inside WebGL.** The canvas is decorative/progressive-enhancement, layered under real DOM exactly like form-3d's `.panel` pattern.
- **`functions/api/*.js`, `wrangler.toml`, `deploy.sh`, KV bindings are not touched.**
- **The other 15 HTML pages are not touched in this phase** — they keep `css/glass.css`/`js/glass.js` until their own phase (2–5) converts them. `css/scene.css` is written so those phases can adopt it the same way `glass.css` was adopted sitewide, but Phase 1 wires it into `index.html` only.

---

### Task 1: Font asset pipeline — extrude-ready "OADIO" glyphs

**Files:**
- Create: `tools/ArchivoBlack-Regular.ttf` (copy from `/home/x/Projects/form-3d/tools/ArchivoBlack-Regular.ttf`)
- Create: `tools/OFL.txt` (copy from `/home/x/Projects/form-3d/tools/OFL.txt`)
- Create: `tools/convert-font.mjs`
- Create: `tools/convert-font.test.mjs`
- Output (generated, then committed): `fonts/archivo-black.json`

**Interfaces:**
- Produces: `fonts/archivo-black.json` — a three.js `FontLoader`-compatible typeface JSON with glyph outlines for `O`, `A`, `D`, `I` (unique letters in "OADIO"; `O` is reused for both occurrences by Task 4's scene code). Consumed by Task 4 via `new FontLoader().loadAsync('/fonts/archivo-black.json')`.

- [ ] **Step 1: Copy the source font and license from form-3d**

```bash
cp /home/x/Projects/form-3d/tools/ArchivoBlack-Regular.ttf tools/ArchivoBlack-Regular.ttf
cp /home/x/Projects/form-3d/tools/OFL.txt tools/OFL.txt
```

- [ ] **Step 2: Write the failing test**

`tools/convert-font.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('archivo-black.json has usable glyph outlines for every letter in OADIO', () => {
  const data = JSON.parse(readFileSync(new URL('../fonts/archivo-black.json', import.meta.url)));
  for (const char of ['O', 'A', 'D', 'I']) {
    assert.ok(data.glyphs[char], `missing glyph for ${char}`);
    assert.ok(data.glyphs[char].o.trim().length > 0, `empty outline for ${char}`);
    assert.ok(Number.isFinite(data.glyphs[char].ha), `missing advance width for ${char}`);
  }
  assert.equal(data.familyName, 'Archivo Black');
  assert.ok(Number.isFinite(data.resolution) && data.resolution > 0);
});
```

- [ ] **Step 2b: Run test, verify it fails**

Run: `node --test tools/`
Expected: FAIL — `ENOENT: no such file or directory, open '.../fonts/archivo-black.json'`

- [ ] **Step 3: Write the conversion script**

`tools/convert-font.mjs`:
```js
import opentype from 'opentype.js';
import { writeFileSync, readFileSync } from 'node:fs';

const CHARS = 'OADI'; // unique letters used by the "OADIO" wordmark mesh

const buf = readFileSync(new URL('./ArchivoBlack-Regular.ttf', import.meta.url));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const unitsPerEm = font.unitsPerEm;

const glyphs = {};

for (const char of CHARS) {
  const glyph = font.charToGlyph(char);
  const path = glyph.getPath(0, 0, unitsPerEm);

  // opentype.js returns paths in canvas convention (y grows downward);
  // three.js's typeface format expects font convention (y grows upward).
  const tokens = [];
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        tokens.push('m', round(cmd.x), round(-cmd.y));
        break;
      case 'L':
        tokens.push('l', round(cmd.x), round(-cmd.y));
        break;
      case 'Q':
        tokens.push('q', round(cmd.x), round(-cmd.y), round(cmd.x1), round(-cmd.y1));
        break;
      case 'C':
        tokens.push('b', round(cmd.x), round(-cmd.y), round(cmd.x1), round(-cmd.y1), round(cmd.x2), round(-cmd.y2));
        break;
      case 'Z':
        break;
    }
  }

  const bbox = glyph.getBoundingBox();
  glyphs[char] = {
    ha: Math.round(glyph.advanceWidth),
    x_min: Math.round(bbox.x1),
    x_max: Math.round(bbox.x2),
    o: tokens.join(' ') + ' ',
  };
}

function round(n) {
  return Math.round(n);
}

const out = {
  glyphs,
  familyName: font.names.fontFamily?.en || 'Archivo Black',
  ascender: Math.round(font.ascender),
  descender: Math.round(font.descender),
  underlinePosition: -100,
  underlineThickness: 50,
  boundingBox: {
    xMin: Math.round(font.tables.head.xMin),
    xMax: Math.round(font.tables.head.xMax),
    yMin: Math.round(font.tables.head.yMin),
    yMax: Math.round(font.tables.head.yMax),
  },
  resolution: unitsPerEm,
  cssFontWeight: 'normal',
  cssFontStyle: 'normal',
};

writeFileSync(new URL('../fonts/archivo-black.json', import.meta.url), JSON.stringify(out));
console.log('Wrote fonts/archivo-black.json, glyphs:', Object.keys(glyphs).join(', '));
```

- [ ] **Step 4: Install opentype.js locally in `tools/` and run the script**

```bash
mkdir -p fonts
cd tools && npm init -y >/dev/null && npm install opentype.js@2.0.0 --no-audit --no-fund
cd ..
node tools/convert-font.mjs
```
Expected output: `Wrote fonts/archivo-black.json, glyphs: O, A, D, I`

- [ ] **Step 5: Run test, verify it passes**

Run: `node --test tools/`
Expected: PASS (1 test, 4 assertions per letter)

- [ ] **Step 6: Remove the temporary dependency install (never deployed, never committed)**

```bash
rm -rf tools/node_modules tools/package.json tools/package-lock.json
```
`tools/node_modules` was already covered by the repo's existing `node_modules/` `.gitignore` rule; this step also keeps it out of `wrangler pages deploy`'s upload, which honors no ignore file.

- [ ] **Step 7: Commit**

```bash
git add tools/ArchivoBlack-Regular.ttf tools/OFL.txt tools/convert-font.mjs tools/convert-font.test.mjs fonts/archivo-black.json
git commit -m "feat(3d): add OADIO wordmark font pipeline + generated typeface JSON"
```

---

### Task 2: Capability detection (`js/3d/fallback.js`)

**Files:**
- Create: `js/3d/fallback.js`
- Test: `js/3d/fallback.test.mjs`

**Interfaces:**
- Produces: `detectCapability(overrides?)` → `'full' | 'reduced' | 'poster'`. Consumed by Task 6 (`entry.js`) to decide whether to dynamic-import the three.js scene at all.

- [ ] **Step 1: Write the failing test**

`js/3d/fallback.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCapability } from './fallback.js';

test('no WebGL forces poster', () => {
  assert.equal(detectCapability({ reducedMotion: false, hasWebGL: false, saveData: false, viewportWidth: 1200 }), 'poster');
});

test('save-data forces poster even with WebGL available', () => {
  assert.equal(detectCapability({ reducedMotion: false, hasWebGL: true, saveData: true, viewportWidth: 1200 }), 'poster');
});

test('reduced motion on a narrow viewport forces poster', () => {
  assert.equal(detectCapability({ reducedMotion: true, hasWebGL: true, saveData: false, viewportWidth: 375 }), 'poster');
});

test('reduced motion on a wide viewport still renders, in reduced mode', () => {
  assert.equal(detectCapability({ reducedMotion: true, hasWebGL: true, saveData: false, viewportWidth: 1200 }), 'reduced');
});

test('no constraints -> full experience', () => {
  assert.equal(detectCapability({ reducedMotion: false, hasWebGL: true, saveData: false, viewportWidth: 1200 }), 'full');
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test js/3d/`
Expected: FAIL — `Cannot find module '.../js/3d/fallback.js'`

- [ ] **Step 3: Implement**

`js/3d/fallback.js`:
```js
export function detectCapability({
  reducedMotion = hasReducedMotion(),
  hasWebGL = probeWebGL(),
  saveData = hasSaveData(),
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
} = {}) {
  if (!hasWebGL || saveData) return 'poster';
  if (reducedMotion && viewportWidth < 480) return 'poster';
  return reducedMotion ? 'reduced' : 'full';
}

function hasReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasSaveData() {
  return typeof navigator !== 'undefined' && !!(navigator.connection && navigator.connection.saveData);
}

function probeWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}
```
The default-parameter helpers (`hasReducedMotion`, `probeWebGL`, `hasSaveData`) only run when a field is omitted from the call — every test above passes all four fields explicitly, so they never touch `window`/`document`/`navigator` and the module is safely testable under plain Node.

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test js/3d/`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add js/3d/fallback.js js/3d/fallback.test.mjs
git commit -m "feat(3d): add WebGL/reduced-motion/save-data capability detection"
```

---

### Task 3: Responsive layout + scatter math (`js/3d/layout.js`)

**Files:**
- Create: `js/3d/layout.js`
- Test: `js/3d/layout.test.mjs`

**Interfaces:**
- Produces: `computeResponsiveLayout(aspect: number) → { scale, x, y }`; `buildScatterTargets(letters: Array) → Array<{ letter, target: {x,y,z,rx,ry} }>`. Consumed by Task 4 (`scene.js`, responsive layout) and Task 5 (`narrative.js`, scatter beat).

- [ ] **Step 1: Write the failing test**

`js/3d/layout.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeResponsiveLayout, buildScatterTargets } from './layout.js';

test('portrait aspect shrinks the word and drops it into the lower third', () => {
  const l = computeResponsiveLayout(0.5);
  assert.equal(l.scale, 0.42);
  assert.ok(l.y < 0);
});

test('square-ish aspect uses the mid breakpoint', () => {
  const l = computeResponsiveLayout(1.0);
  assert.equal(l.scale, 0.75);
});

test('wide aspect uses full scale, biased right of the text column', () => {
  const l = computeResponsiveLayout(1.6);
  assert.equal(l.scale, 1);
  assert.ok(l.x > 0);
});

test('scatter targets pair one-to-one with letters, positionally not by character', () => {
  const letters = ['O', 'A', 'D', 'I', 'O'];
  const result = buildScatterTargets(letters);
  assert.equal(result.length, 5);
  result.forEach((entry, i) => assert.equal(entry.letter, letters[i]));
  // OADIO repeats 'O' at index 0 and 4 — targets must differ, proving the
  // mapping is positional. A character-keyed lookup (e.g. {O: ..., A: ...})
  // would silently collide the two O's onto the same target.
  assert.notDeepEqual(result[0].target, result[4].target);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test js/3d/`
Expected: FAIL — `Cannot find module '.../js/3d/layout.js'`

- [ ] **Step 3: Implement**

`js/3d/layout.js`:
```js
export function computeResponsiveLayout(aspect) {
  if (aspect < 0.8) return { scale: 0.42, x: -0.55, y: -2.6 };
  if (aspect < 1.1) return { scale: 0.75, x: 0, y: -1.1 };
  return { scale: 1, x: 0.9, y: 0 };
}

const SCATTER_SPREAD = [
  { x: -1.6, y: 1.7, z: 1.1, rx: 0.6, ry: -0.8 },
  { x: 3.1, y: -1.6, z: -0.9, rx: -0.5, ry: 1.0 },
  { x: -0.7, y: -2.0, z: 0.7, rx: 0.85, ry: 0.35 },
  { x: 2.6, y: 1.5, z: -1.3, rx: -0.65, ry: -0.55 },
  { x: -2.4, y: -0.4, z: 1.4, rx: 0.4, ry: 0.9 },
];

export function buildScatterTargets(letters) {
  return letters.map((letter, i) => ({ letter, target: SCATTER_SPREAD[i % SCATTER_SPREAD.length] }));
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test js/3d/`
Expected: PASS (9 tests total — 5 from Task 2 + 4 here)

- [ ] **Step 5: Commit**

```bash
git add js/3d/layout.js js/3d/layout.test.mjs
git commit -m "feat(3d): add responsive layout + positional scatter-target math"
```

---

### Task 4: three.js scene (`js/3d/scene.js`)

**Files:**
- Create: `js/3d/scene.js`

**Interfaces:**
- Consumes: `computeResponsiveLayout` from `js/3d/layout.js` (Task 3); `fonts/archivo-black.json` (Task 1) at runtime via `fetch`/`FontLoader`.
- Produces: `async function createScene(canvas: HTMLCanvasElement) → { renderer, scene, camera, group, letters, render }`, where `letters` is an **ordered array** `[{ char, mesh, home: Vector3, homeRotation: Euler }, ...]` in "OADIO" order (index 0 and 4 are both `'O'` — consumers must use array position, never a char-keyed lookup, per Task 3's test). Consumed by Task 5 (`narrative.js`) and Task 6 (`entry.js`).

- [ ] **Step 1: Implement**

`js/3d/scene.js`:
```js
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { computeResponsiveLayout } from './layout.js';

const WORD = ['O', 'A', 'D', 'I', 'O'];
const LETTER_SIZE = 1.3;
const EXTRUDE_DEPTH = 0.5;
const GAP = 0.14;

export async function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a130b');

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10.5);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight('#ffbe4b', 1.4); // gold
  key.position.set(4, 5, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight('#ff5c26', 1.1); // amber
  rim.position.set(-5, -2, -4);
  scene.add(rim);

  scene.add(new THREE.AmbientLight('#2dd4bf', 0.3)); // teal ambient

  const font = await new FontLoader().loadAsync('/fonts/archivo-black.json');

  const material = new THREE.MeshPhysicalMaterial({
    color: '#f5f5f7',
    metalness: 0.12,
    roughness: 0.3,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
  });

  const viewport = new THREE.Group();
  scene.add(viewport);

  const group = new THREE.Group();
  viewport.add(group);

  let cursorX = 0;
  const built = WORD.map((char) => {
    const shapes = font.generateShapes(char, LETTER_SIZE);
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: EXTRUDE_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 8,
    });
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    geometry.translate(-(bbox.min.x + width / 2), -(bbox.min.y + height / 2), -EXTRUDE_DEPTH / 2);
    const mesh = new THREE.Mesh(geometry, material);
    return { char, mesh, advance: width };
  });

  const letters = [];
  built.forEach((entry) => {
    entry.mesh.position.x = cursorX + entry.advance / 2;
    cursorX += entry.advance + GAP;
  });
  const wordWidth = cursorX - GAP;
  built.forEach((entry) => {
    entry.mesh.position.x -= wordWidth / 2;
    group.add(entry.mesh);
    letters.push({
      char: entry.char,
      mesh: entry.mesh,
      home: entry.mesh.position.clone(),
      homeRotation: entry.mesh.rotation.clone(),
    });
  });

  function applyResponsiveLayout(w, h) {
    const layout = computeResponsiveLayout(w / h);
    viewport.scale.setScalar(layout.scale);
    viewport.position.set(layout.x, layout.y, 0);
  }

  function onResize() {
    const { innerWidth: w, innerHeight: h } = window;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    applyResponsiveLayout(w, h);
  }
  window.addEventListener('resize', onResize);
  applyResponsiveLayout(window.innerWidth, window.innerHeight);

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, group, letters, render };
}
```

- [ ] **Step 2: Syntax-check (import resolution needs a browser + the import map from Task 9, so this is the extent of what's checkable in isolation)**

Run: `node --check js/3d/scene.js`
Expected: no output (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add js/3d/scene.js
git commit -m "feat(3d): add OADIO wordmark scene (extrude, light rig, responsive layout)"
```

Full visual verification of this module happens in Task 10, once Task 9 wires it into `index.html` with the import map.

---

### Task 5: Scroll narrative (`js/3d/narrative.js`)

**Files:**
- Create: `js/3d/narrative.js`

**Interfaces:**
- Consumes: `buildScatterTargets` from `js/3d/layout.js` (Task 3); `group`/`letters` shape produced by `createScene` (Task 4).
- Produces: `createNarrative({ group, letters, mode }) → object` (a GSAP timeline in `full` mode, an array of `ScrollTrigger` instances in `reduced` mode). Consumed by Task 6 (`entry.js`).

- [ ] **Step 1: Implement**

`js/3d/narrative.js`:
```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildScatterTargets } from './layout.js';

gsap.registerPlugin(ScrollTrigger);

export function createNarrative({ group, letters, mode }) {
  return mode === 'reduced'
    ? createReducedNarrative({ group })
    : createScrubNarrative({ group, letters });
}

// fig.00 hero -> fig.01 services -> fig.02 why-us -> fig.03 cta/footer.
// Story beat: the word fractures into its 5 letters (mirroring the 5
// services) at the services scroll position, and reassembles at the
// "why one supplier" section — the fracture/reassemble technique made
// literal for oadio's pitch, only touching that message where the copy
// already lands it (see docs/superpowers/specs/2026-07-02-threejs-redesign-design.md).
function createScrubNarrative({ group, letters }) {
  const scattered = buildScatterTargets(letters.map((l) => l.char));

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#top',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
    },
  });

  tl.to(group.rotation, { y: Math.PI * 0.65, duration: 1 }, 0);
  tl.to(group.position, { x: -0.4, z: 1.0, duration: 1 }, 0);

  letters.forEach((letter, i) => {
    const target = scattered[i].target;
    tl.to(
      letter.mesh.position,
      { x: letter.home.x + target.x, y: letter.home.y + target.y, z: letter.home.z + target.z, duration: 1 },
      1,
    );
    tl.to(letter.mesh.rotation, { x: target.rx, y: letter.homeRotation.y + target.ry, duration: 1 }, 1);
  });
  tl.to(group.rotation, { y: Math.PI * 1.05, duration: 1 }, 1);

  letters.forEach((letter) => {
    tl.to(letter.mesh.position, { x: letter.home.x, y: letter.home.y, z: letter.home.z, duration: 1 }, 2);
    tl.to(letter.mesh.rotation, { x: 0, y: letter.homeRotation.y, duration: 1 }, 2);
  });
  tl.to(group.rotation, { y: Math.PI * 2, duration: 1 }, 2);
  // return to LOCAL rest (0,0,0) — the rightward rest bias lives on the
  // parent `viewport` group (see scene.js applyResponsiveLayout), not here.
  tl.to(group.position, { x: 0, z: 0, duration: 1 }, 2);

  return tl;
}

// prefers-reduced-motion: no Lenis, no scroll-scrubbed continuous rotation
// or scatter (both are vestibular-motion risks). Each beat gets a single
// bounded scale pulse (8%), triggered once per section via
// IntersectionObserver, never tied continuously to scroll position.
function createReducedNarrative({ group }) {
  const beats = ['.hero', '#services', '.booth', '.cta-band'];
  return beats.map((selector) =>
    ScrollTrigger.create({
      trigger: selector,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        gsap.to(group.scale, {
          x: self.isActive ? 1.08 : 1,
          y: self.isActive ? 1.08 : 1,
          z: self.isActive ? 1.08 : 1,
          duration: 0.5,
          overwrite: true,
        });
      },
    }),
  );
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check js/3d/narrative.js`
Expected: no output (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add js/3d/narrative.js
git commit -m "feat(3d): add scroll-scrubbed + reduced-motion narrative timelines"
```

---

### Task 6: Bootstrap entry point (`js/3d/entry.js`)

**Files:**
- Create: `js/3d/entry.js`

**Interfaces:**
- Consumes: `detectCapability` (Task 2), `createScene` (Task 4, dynamic import), `createNarrative` (Task 5, dynamic import).
- Produces: sets `document.documentElement.dataset.capability` to `'full' | 'reduced' | 'poster'` (consumed by `css/scene.css`, Task 7, to show/hide `#scene` vs `#scene-poster`). Only imports `three`/GSAP/Lenis when capability is not `'poster'`.

- [ ] **Step 1: Implement**

`js/3d/entry.js`:
```js
import { detectCapability } from './fallback.js';

const capability = detectCapability();
document.documentElement.dataset.capability = capability;

if (capability !== 'poster') {
  boot(capability);
}

async function boot(mode) {
  const [{ createScene }, { createNarrative }] = await Promise.all([
    import('./scene.js'),
    import('./narrative.js'),
  ]);

  const canvas = document.getElementById('scene');
  const { group, letters, render } = await createScene(canvas);

  if (mode === 'full') {
    const [{ default: gsap }, Lenis] = await Promise.all([
      import('gsap'),
      import('lenis').then((m) => m.default),
    ]);
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const { ScrollTrigger } = await import('gsap/ScrollTrigger');
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  createNarrative({ group, letters, mode });

  function frame() {
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check js/3d/entry.js`
Expected: no output (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add js/3d/entry.js
git commit -m "feat(3d): add capability-gated bootstrap wiring scene + narrative"
```

---

### Task 7: Dark override stylesheet (`css/scene.css`)

**Files:**
- Create: `css/scene.css`

**Interfaces:**
- Consumes (selectors it must match): `#scene`, `#scene-poster`, `#scroll-story` — created in Task 9's `index.html` changes. `[data-capability]` attribute — set by Task 6's `entry.js`.
- Produces: dark repaint of `style.css`'s tokens; canvas/poster layering rules. Reusable by Phases 2–5 exactly as `glass.css` was reused sitewide (out of scope to wire elsewhere in this phase).

- [ ] **Step 1: Implement**

`css/scene.css`:
```css
/* ============================================================
   scene.css — dark override layer for the three.js redesign.
   style.css (cream) still loads first and owns all layout; this
   repaints tokens dark and adds canvas/poster layering, same
   override pattern glass.css used (now retired on this page).
   Palette reuses glass.css's already WCAG-AA-audited values.
   ============================================================ */
:root {
  --paper: #090a0f;
  --paper-2: rgba(255, 255, 255, 0.02);
  --card: rgba(255, 255, 255, 0.05);
  --ink: #f5f5f7;
  --ink-2: rgba(245, 245, 247, 0.64);
  --amber: #ff5c26;
  --amber-2: #ff7647;
  --gold: #ffbe4b;
  --teal: #2dd4bf;
  --teal-2: #4dedd5;
  --booth: #06070a;
  --line: rgba(255, 255, 255, 0.08);
  --line-2: rgba(255, 255, 255, 0.16);
  --shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

body {
  background: var(--paper);
  color: var(--ink);
}

h1 em, .anchor-line em, .cta-band h2 em {
  font-style: italic;
  color: var(--amber);
}

/* three.js canvas sits behind everything; DOM content stays real and on
   top, exactly like the retired glass layer sat over the cream base. */
#scene,
#scene-poster {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: block;
  z-index: 0;
}
#scene-poster {
  object-fit: cover;
}

/* canvas and poster are mutually exclusive — entry.js sets exactly one
   data-capability value, never both rendering at once. */
html[data-capability="full"] #scene-poster,
html[data-capability="reduced"] #scene-poster {
  display: none;
}
html[data-capability="poster"] #scene {
  display: none;
}
/* before entry.js runs (or if it fails to load), default to showing the
   poster and hiding the canvas — never an empty background. */
html:not([data-capability]) #scene {
  display: none;
}

#scroll-story,
.site-header,
.mobile-cta,
.site-footer {
  position: relative;
  z-index: 1;
}

.site-header {
  background: rgba(9, 10, 15, 0.72);
  backdrop-filter: blur(12px) saturate(1.1);
  border-bottom: 1px solid var(--line);
}

.receipt, .svc-card, .price, .nav-panel {
  background: var(--card);
  border-color: var(--line-2);
}

.booth {
  background: var(--booth);
}

.ticker, .site-footer::before {
  border-color: var(--line);
}

@media (prefers-reduced-motion: reduce) {
  html[data-capability="reduced"] #scene {
    /* still rendered (per spec: reduced mode keeps three.js, degrades
       its motion in narrative.js) — no additional CSS motion here. */
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/scene.css
git commit -m "feat(3d): add dark override stylesheet for the three.js homepage"
```

---

### Task 8: Poster fallback asset

**Files:**
- Create: `oadio-3d-poster.svg` (repo root, alongside existing `icon.svg`/`og-image.svg`)

**Interfaces:**
- Produces: static image referenced by `<img id="scene-poster">` in Task 9's `index.html`. Must not depend on any web font (it's the fallback for when the heavier pipeline, including web fonts already loaded via `<link>` in `<head>`, is being avoided for save-data/low-end reasons) — uses a generic bold system sans via `font-family` list, not `@font-face`.

- [ ] **Step 1: Create the SVG**

`oadio-3d-poster.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="Oadio">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#ffbe4b" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#ff5c26" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#090a0f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="#090a0f"/>
  <rect width="1600" height="900" fill="url(#glow)"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="900"
        font-size="240" letter-spacing="6" fill="#f5f5f7">OADIO</text>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add oadio-3d-poster.svg
git commit -m "feat(3d): add static poster fallback for no-WebGL/save-data/reduced-motion"
```

---

### Task 9: Wire it all into `index.html`

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `css/scene.css` (Task 7), `oadio-3d-poster.svg` (Task 8), `js/3d/entry.js` (Task 6), the exact CDN URLs from Global Constraints.

- [ ] **Step 1: Replace the glass stylesheet link with the scene stylesheet + import map, in `<head>`**

Old (`index.html` line 34-35):
```html
    <link rel="stylesheet" href="css/style.css?v=22">
    <link rel="stylesheet" href="css/glass.css?v=4">
```
New:
```html
    <link rel="stylesheet" href="css/style.css?v=22">
    <link rel="stylesheet" href="css/scene.css?v=1">
    <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/",
        "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js",
        "gsap/ScrollTrigger": "https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js",
        "lenis": "https://cdn.jsdelivr.net/npm/lenis@1.3.25/dist/lenis.mjs"
      }
    }
    </script>
```

- [ ] **Step 2: Replace the aurora/grain background divs with the canvas + poster, right after `<body>`**

Old (`index.html` lines 102-105):
```html
<body>
    <div class="grain" aria-hidden="true"></div>
    <div class="aurora" aria-hidden="true"><span class="blob-amber"></span><span class="blob-gold"></span><span class="blob-teal"></span></div>
    <a class="skip-link" href="#top">Skip to content</a>
```
New:
```html
<body>
    <img id="scene-poster" src="/oadio-3d-poster.svg" alt="" aria-hidden="true">
    <canvas id="scene" aria-hidden="true"></canvas>
    <a class="skip-link" href="#top">Skip to content</a>
```

- [ ] **Step 3: Move the CTA band inside `<main id="top">`, after the booth section, so the scroll narrative's single trigger (`#top`, used in Task 5) spans all four beats**

Old (`index.html` lines 239-247, spanning the end of `.booth`, close of `<main>`, `.mobile-cta`, and the start of `.cta-band`):
```html
        </section>

    </main>

    <div class="mobile-cta">
        <a href="/contact" class="btn btn-solid">Talk to us</a>
    </div>

    <section class="cta-band">
```
New:
```html
        </section>

        <section class="cta-band">
```
And immediately after that same `.cta-band` section's closing `</section>` (old line 253, right before `<footer class="site-footer">`), add the closing `</main>` and the (now relocated) mobile CTA:
```html
        </section>

    </main>

    <div class="mobile-cta">
        <a href="/contact" class="btn btn-solid">Talk to us</a>
    </div>

    <footer class="site-footer">
```

- [ ] **Step 4: Remove `.reveal`/`.reveal dN` classes from hero/services/booth text elements — the new design's motion budget is the 3D object, not fade-ups**

Run this to see every occurrence first:
```bash
grep -n 'reveal' index.html
```
For each match in the hero, services (`#services`), and booth sections, remove `reveal`, `reveal d1`, `reveal d2`, `reveal d3` from the element's `class` attribute (keep any other classes on that element unchanged — e.g. `class="eyebrow reveal"` becomes `class="eyebrow"`, `class="svc-card reveal d1"` becomes `class="svc-card"`). Do not touch `.reveal` usage on other pages — this step only edits `index.html`.

- [ ] **Step 5: Wrap the story sections in `#scroll-story` and load the entry script before `</body>`**

Old (`index.html` line 131, opening of `<main>`):
```html
    <main id="top">
```
New:
```html
    <main id="top">
        <div id="scroll-story">
```
And at the point identified in Step 3 where `</main>` now falls, close the wrapper just before it:
```html
        </div>
    </main>
```
Old (`index.html` lines 268-269):
```html
    <script src="js/main.js?v=14"></script>
    <script src="js/glass.js?v=3"></script>
```
New:
```html
    <script src="js/main.js?v=14"></script>
    <script type="module" src="js/3d/entry.js?v=1"></script>
```

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(3d): wire three.js scroll narrative into the homepage"
```

---

### Task 10: Manual integration verification

No new files — this task exercises Tasks 1–9 together in a real browser, since WebGL/scroll behavior can't be verified by `node --test`/`node --check` alone.

- [ ] **Step 1: Serve the site locally**

```bash
npx --yes serve . -l 8080
```

- [ ] **Step 2: Verify the `full` path (default desktop browser, no emulation)**

Open `http://localhost:8080/` in a real browser. Open DevTools console.
Expected:
- No console errors.
- `document.documentElement.dataset.capability` is `"full"`.
- The extruded "OADIO" wordmark is visible behind the hero content, rotating/repositioning as you scroll.
- Scrolling through the services section visibly fractures the word into 5 pieces; scrolling into the "Why Oadio" (booth) section reassembles it.
- Nav toggle, services dropdown, receipt calculator checkboxes (totals update), and mobile CTA visibility all still work exactly as before (these are `js/main.js`, untouched).

- [ ] **Step 3: Verify the `reduced` path**

In DevTools: Rendering tab → "Emulate CSS media feature `prefers-reduced-motion`" → `reduce`. Reload.
Expected:
- `data-capability` is `"reduced"`.
- Page scrolls natively (no Lenis smoothing/lag).
- The wordmark does a small (8%) scale pulse as each section (`.hero`, `#services`, `.booth`, `.cta-band`) enters/leaves — no continuous rotation, no letter scatter tied to scroll position.

- [ ] **Step 4: Verify the `poster` path**

In the DevTools console (still on the reduced-motion emulation from Step 3, to combine both poster triggers), run:
```js
localStorage.clear(); // no-op safeguard, in case of stale state
Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
location.reload();
```
Expected:
- `data-capability` is `"poster"`.
- No network request for `three`/`gsap`/`lenis`/`fonts/archivo-black.json` (check the Network tab, filter by `three`/`gsap`/`lenis`/`archivo`) — confirms the module is never imported, not just hidden.
- The static `oadio-3d-poster.svg` is visible in place of the canvas.
- Turn off the emulation and connection override afterward (DevTools Rendering tab → reset; reload) before moving on.

- [ ] **Step 5: Spot-check accessibility**

- Tab through the page from the top: skip-link appears and works, nav is reachable, receipt checkboxes are reachable and toggleable by keyboard, CTA links are reachable. Focus rings should be visible (amber-2 outline, per existing `:focus-visible` rule in `style.css`).
- Confirm `<canvas id="scene">` and `<img id="scene-poster">` are `aria-hidden="true"` and never receive focus.
- Confirm page `<title>`, meta description, and the JSON-LD `@graph` block are unchanged (`grep -c 'ld+json' index.html` should still report 1) — the redesign must not have touched SEO metadata.

- [ ] **Step 6: No commit for this task** — it's verification only. If any check above fails, fix the relevant Task's file and re-run this task's steps before proceeding.

---

### Task 11: Final review and handoff

**Files:** none created — housekeeping and closure.

- [ ] **Step 1: Confirm no build artifacts leaked into the repo**

```bash
git status --porcelain
```
Expected: only the files this plan intentionally created/modified are tracked; no `node_modules/`, `package.json`, or `package-lock.json` anywhere (Task 1's Step 6 already removed the temporary `tools/` install).

- [ ] **Step 2: Confirm the other 15 pages are untouched**

```bash
git diff --stat main -- . ':!index.html' ':!css/scene.css' ':!js/3d' ':!fonts' ':!tools' ':!oadio-3d-poster.svg' ':!docs'
```
Expected: empty output — nothing outside this phase's file set changed.

- [ ] **Step 3: Run the full unit test suite one more time**

```bash
node --test js/3d/ tools/
```
Expected: PASS, 9 tests (Task 2 + Task 3) + 1 test (Task 1).

- [ ] **Step 4: Update the project memory note that documented the (now-superseded-on-this-page) glass re-skin**

This isn't a repo file — it's the persistent memory at `/home/x/.claude/projects/-home-x-oadio-site/memory/glass-reskin-live.md`. Add a note that `index.html` moved to the three.js redesign in Phase 1 of `docs/superpowers/specs/2026-07-02-threejs-redesign-design.md`, and that `glass.css`/`glass.js` remain live on the other 15 pages until Phases 2–5 convert them.

- [ ] **Step 5: Report status to the user** — Phase 1 (foundation + homepage) is complete and locally verified. Deployment (`./deploy.sh`) and Phases 2–5 are separate, explicit next decisions — do not deploy or start Phase 2 without the user's go-ahead.
