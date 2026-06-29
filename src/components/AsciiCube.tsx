'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import * as THREE from 'three';

type CubeEvent =
  | { kind: 'pulse'; face: number; x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; width: number; strength: number }
  | { kind: 'burst'; face: number; cx: number; cy: number; r: number; t0: number; dur: number; strength: number };

type Options = { className?: string; invert?: boolean };

const FACE_COLS = 40;
const ROW_SECTIONS = 5;
const ROWS_PER_SECTION = 8;
const FACE_ROWS = ROW_SECTIONS * ROWS_PER_SECTION;
const NUM_FACES = 6;
const CUBE_HALF = 2.35;
const DOT_SCALE = 0.78;
const SECTION_GAP = 1.5;
const ROW_OFF_RATIO = 0.08;
const CELL_FADE_SPEED = 6.0;
const STAGGER_SPREAD = 0.8;
const LOAD_ROW_INTERVAL = 0.015;

const THEME_PALETTES = {
  dark: { face: 0x020202, edge: 0x111111, off: 0 },
  light: { face: 0xf0f0f0, edge: 0xc8c8c8, off: 1 },
} as const;
const LIGHT_CONTRAST = 1.5;

function faceRowOffset(row: number): number {
  return row + Math.floor(row / ROWS_PER_SECTION) * SECTION_GAP;
}

const MAX_ROW_OFFSET = faceRowOffset(FACE_ROWS - 1);
const MAX_COL_OFFSET = FACE_COLS - 1;

const FACE_CONFIGS = [
  { c: [0, 0, 1],  u: [1, 0, 0],  v: [0, 1, 0],  rot: [0, 0, 0] },
  { c: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0],  rot: [0, Math.PI, 0] },
  { c: [1, 0, 0],  u: [0, 0, -1], v: [0, 1, 0],  rot: [0, Math.PI / 2, 0] },
  { c: [-1, 0, 0], u: [0, 0, 1],  v: [0, 1, 0],  rot: [0, -Math.PI / 2, 0] },
  { c: [0, 1, 0],  u: [1, 0, 0],  v: [0, 0, -1], rot: [-Math.PI / 2, 0, 0] },
  { c: [0, -1, 0], u: [1, 0, 0],  v: [0, 0, 1],  rot: [Math.PI / 2, 0, 0] },
];

export function AsciiCube({ className, invert }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  // When `invert` is set, the cube uses the palette that matches the framed
  // interior background (which is the inverse of the outer theme): a light cube
  // on the light/gray interior in dark mode, and a dark cube in light mode.
  const baseDark = resolvedTheme !== 'light';
  const effectiveDark = invert ? !baseDark : baseDark;
  const isDarkRef = useRef(effectiveDark);

  useEffect(() => {
    isDarkRef.current = effectiveDark;
  }, [effectiveDark]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const faceDefs = FACE_CONFIGS.map(f => ({
      center: new THREE.Vector3(f.c[0] * CUBE_HALF, f.c[1] * CUBE_HALF, f.c[2] * CUBE_HALF),
      u: new THREE.Vector3(f.u[0], f.u[1], f.u[2]),
      v: new THREE.Vector3(f.v[0], f.v[1], f.v[2]),
      normal: new THREE.Vector3().crossVectors(
        new THREE.Vector3(f.u[0], f.u[1], f.u[2]),
        new THREE.Vector3(f.v[0], f.v[1], f.v[2]),
      ).normalize(),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(f.rot[0], f.rot[1], f.rot[2])),
    }));

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 14.3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const innerGeom = new THREE.BoxGeometry(CUBE_HALF * 2, CUBE_HALF * 2, CUBE_HALF * 2);
    const innerMat = new THREE.MeshBasicMaterial({ color: isDarkRef.current ? 0x020202 : 0xfafafa });
    cubeGroup.add(new THREE.Mesh(innerGeom, innerMat));

    const edgesGeom = new THREE.EdgesGeometry(innerGeom);
    const edgesMat = new THREE.LineBasicMaterial({ color: isDarkRef.current ? 0x111111 : 0xe0e0e0 });
    cubeGroup.add(new THREE.LineSegments(edgesGeom, edgesMat));

    const faceExtent = CUBE_HALF * 2;
    const colSpacing = faceExtent / MAX_COL_OFFSET;
    const rowSpacing = faceExtent / MAX_ROW_OFFSET;
    const dotSize = Math.min(colSpacing, rowSpacing) * DOT_SCALE;
    const miniDotSize = dotSize * 0.22;

    const count = NUM_FACES * FACE_COLS * FACE_ROWS;

    const squareGeom = new THREE.PlaneGeometry(1, 1);
    const squareMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const squareMesh = new THREE.InstancedMesh(squareGeom, squareMat, count);
    squareMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cubeGroup.add(squareMesh);

    const dotGeom = new THREE.PlaneGeometry(1, 1);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dotMesh = new THREE.InstancedMesh(dotGeom, dotMat, count);
    dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cubeGroup.add(dotMesh);

    const squareColors = new Float32Array(count * 3);
    (squareMesh as any).instanceColor = new THREE.InstancedBufferAttribute(squareColors, 3);
    const dotColors = new Float32Array(count * 3);
    (dotMesh as any).instanceColor = new THREE.InstancedBufferAttribute(dotColors, 3);

    const energy = new Float32Array(count);
    const target = new Float32Array(count);
    const noise = new Float32Array(count);
    const dotNoise = new Float32Array(count);
    const dotVis = new Float32Array(count);
    const dotVisTarget = new Float32Array(count);
    const basePos = new Float32Array(count * 3);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();

    for (let face = 0; face < NUM_FACES; face++) {
      const fd = faceDefs[face];

      for (let row = 0; row < FACE_ROWS; row++) {
        for (let col = 0; col < FACE_COLS; col++) {
          const i = face * FACE_COLS * FACE_ROWS + row * FACE_COLS + col;

          const cu = (col - MAX_COL_OFFSET / 2) * colSpacing;
          const cv = (faceRowOffset(row) - MAX_ROW_OFFSET / 2) * rowSpacing;

          const x = fd.center.x + fd.u.x * cu + fd.v.x * cv + fd.normal.x * 0.005;
          const y = fd.center.y + fd.u.y * cu + fd.v.y * cv + fd.normal.y * 0.005;
          const z = fd.center.z + fd.u.z * cu + fd.v.z * cv + fd.normal.z * 0.005;

          basePos[i * 3] = x;
          basePos[i * 3 + 1] = y;
          basePos[i * 3 + 2] = z;

          pos.set(x, y, z);
          scl.set(dotSize, dotSize, 1);
          m.compose(pos, fd.quat, scl);
          squareMesh.setMatrixAt(i, m);

          pos.set(x + fd.normal.x * 0.001, y + fd.normal.y * 0.001, z + fd.normal.z * 0.001);
          scl.set(0, 0, 1);
          m.compose(pos, fd.quat, scl);
          dotMesh.setMatrixAt(i, m);

          energy[i] = 1;
          target[i] = 0;
          noise[i] = Math.random();
          dotNoise[i] = Math.random();
          dotVis[i] = Math.random() > 0.5 ? 1 : 0;
          dotVisTarget[i] = dotVis[i];
        }
      }
    }

    squareMesh.instanceMatrix.needsUpdate = true;
    dotMesh.instanceMatrix.needsUpdate = true;

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const events: CubeEvent[] = [];
    const now = () => performance.now() * 0.001;

    function spawnPulse() {
      events.push({
        kind: 'pulse',
        face: Math.floor(Math.random() * NUM_FACES),
        x0: Math.floor(Math.random() * FACE_COLS),
        y0: Math.floor(Math.random() * FACE_ROWS),
        x1: Math.floor(Math.random() * FACE_COLS),
        y1: Math.floor(Math.random() * FACE_ROWS),
        t0: now(),
        dur: THREE.MathUtils.randFloat(3.0, 6.0),
        width: THREE.MathUtils.randFloat(3.0, 7.0),
        strength: THREE.MathUtils.randFloat(0.3, 0.7),
      });
    }

    function spawnBurst() {
      events.push({
        kind: 'burst',
        face: Math.floor(Math.random() * NUM_FACES),
        cx: Math.floor(Math.random() * FACE_COLS),
        cy: Math.floor(Math.random() * FACE_ROWS),
        r: THREE.MathUtils.randFloat(5.0, 15.0),
        t0: now(),
        dur: THREE.MathUtils.randFloat(2.0, 4.5),
        strength: THREE.MathUtils.randFloat(0.2, 0.5),
      });
    }

    const totalRows = NUM_FACES * FACE_ROWS;
    const rowVis = new Uint8Array(totalRows).fill(1);
    const cellActive = new Float32Array(count).fill(0);
    const cellDelay = new Float32Array(count);
    const cellTriggered = new Float32Array(count);

    const startTime = now();
    for (let i = 0; i < count; i++) {
      cellDelay[i] = Math.random() * STAGGER_SPREAD;
      const faceIdx = Math.floor(i / (FACE_COLS * FACE_ROWS));
      const localIdx = i - faceIdx * FACE_COLS * FACE_ROWS;
      const row = Math.floor(localIdx / FACE_COLS);
      const globalRow = faceIdx * FACE_ROWS + row;
      cellTriggered[i] = startTime + globalRow * LOAD_ROW_INTERVAL + cellDelay[i];
    }

    const offCount = Math.round(totalRows * ROW_OFF_RATIO);
    const shuffled = Array.from({ length: totalRows }, (_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const loadDuration = totalRows * LOAD_ROW_INTERVAL + STAGGER_SPREAD + 1.0;
    for (let i = 0; i < offCount; i++) rowVis[shuffled[i]] = 0;

    let activeFace = Math.floor(Math.random() * NUM_FACES);
    let activeSection = Math.floor(Math.random() * ROW_SECTIONS);
    let nextRowFlip = startTime + loadDuration + THREE.MathUtils.randFloat(2.0, 5.0);
    let nextSectionSwitch = startTime + loadDuration + THREE.MathUtils.randFloat(6.0, 12.0);

    function triggerRow(globalRow: number, t: number) {
      const faceIdx = Math.floor(globalRow / FACE_ROWS);
      const localRow = globalRow - faceIdx * FACE_ROWS;
      const base = faceIdx * FACE_COLS * FACE_ROWS + localRow * FACE_COLS;
      for (let c = 0; c < FACE_COLS; c++) {
        cellTriggered[base + c] = t + cellDelay[base + c];
      }
    }

    function updateRowVisibility(t: number, dt: number) {
      if (t >= nextSectionSwitch) {
        nextSectionSwitch = t + THREE.MathUtils.randFloat(6.0, 12.0);
        activeFace = Math.floor(Math.random() * NUM_FACES);
        let next = Math.floor(Math.random() * ROW_SECTIONS);
        while (next === activeSection && ROW_SECTIONS > 1) {
          next = Math.floor(Math.random() * ROW_SECTIONS);
        }
        activeSection = next;
      }

      if (t >= nextRowFlip) {
        nextRowFlip = t + THREE.MathUtils.randFloat(1.5, 4.0);

        const rStart = activeFace * FACE_ROWS + activeSection * ROWS_PER_SECTION;
        const rEnd = rStart + ROWS_PER_SECTION;
        const onRows: number[] = [];
        const offRows: number[] = [];
        for (let r = rStart; r < rEnd; r++) {
          if (rowVis[r] === 1) onRows.push(r);
          else offRows.push(r);
        }

        const maxOff = Math.max(1, Math.round(ROWS_PER_SECTION * ROW_OFF_RATIO));
        if (onRows.length > 0 && offRows.length < maxOff + 1) {
          const pick = onRows[Math.floor(Math.random() * onRows.length)];
          rowVis[pick] = 0;
          triggerRow(pick, t);
        }
        if (offRows.length > 0) {
          const pick = offRows[Math.floor(Math.random() * offRows.length)];
          rowVis[pick] = 1;
          triggerRow(pick, t);
        }
      }

      for (let i = 0; i < count; i++) {
        const faceIdx = Math.floor(i / (FACE_COLS * FACE_ROWS));
        const localIdx = i - faceIdx * FACE_COLS * FACE_ROWS;
        const row = Math.floor(localIdx / FACE_COLS);
        const globalRow = faceIdx * FACE_ROWS + row;
        const tgt = rowVis[globalRow];
        if (t < cellTriggered[i]) continue;
        const cur = cellActive[i];
        if (tgt === 1 && cur < 1) cellActive[i] = Math.min(1, cur + CELL_FADE_SPEED * dt);
        else if (tgt === 0 && cur > 0) cellActive[i] = Math.max(0, cur - CELL_FADE_SPEED * dt);
      }
    }

    for (let i = 0; i < 4; i++) spawnPulse();
    for (let i = 0; i < 2; i++) spawnBurst();

    let lastT = now();

    function updateTargets(t: number) {
      for (let i = 0; i < count; i++) {
        const n = noise[i];
        const slow = Math.sin(t * (0.02 + n * 0.03) + n * 20.0);
        const med = Math.sin(t * (0.06 + n * 0.08) + n * 50.0);
        const raw = slow * 0.55 + med * 0.45;
        target[i] = raw > 0.92 ? 1.0 : 0.0;
      }

      for (let e = events.length - 1; e >= 0; e--) {
        const ev = events[e];
        const age = t - ev.t0;
        if (age >= ev.dur) { events.splice(e, 1); continue; }
        const a = age / ev.dur;
        const faceStart = ev.face * FACE_COLS * FACE_ROWS;
        const faceEnd = faceStart + FACE_COLS * FACE_ROWS;

        if (ev.kind === 'pulse') {
          const { x0, y0, x1, y1, width, strength } = ev;
          const p = a * a * (3 - 2 * a);
          const px = THREE.MathUtils.lerp(x0, x1, p);
          const py = THREE.MathUtils.lerp(y0, y1, p);
          for (let i = faceStart; i < faceEnd; i++) {
            const li = i - faceStart;
            const dx = (li % FACE_COLS) - px;
            const dy = Math.floor(li / FACE_COLS) - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            target[i] = Math.max(target[i], Math.exp(-(d * d) / (2 * width * width)) * strength);
          }
        } else {
          const { cx, cy, r, strength } = ev;
          const ring = THREE.MathUtils.lerp(0.5, r, a);
          for (let i = faceStart; i < faceEnd; i++) {
            const li = i - faceStart;
            const dx = (li % FACE_COLS) - cx;
            const dy = Math.floor(li / FACE_COLS) - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            target[i] = Math.max(target[i], Math.exp(-((d - ring) ** 2) / 12.5) * strength);
          }
        }
      }

      if (events.length < 5 && Math.random() < 0.02) spawnPulse();
      if (events.length < 5 && Math.random() < 0.01) spawnBurst();
    }

    function step(t: number) {
      const dt = Math.min(0.033, Math.max(0.001, t - lastT));
      lastT = t;

      const dark = isDarkRef.current;
      const palette = dark ? THEME_PALETTES.dark : THEME_PALETTES.light;
      innerMat.color.set(palette.face);
      edgesMat.color.set(palette.edge);

      cubeGroup.rotation.z = Math.PI / 4;
      cubeGroup.rotation.y += dt * 0.08;

      updateTargets(t);
      updateRowVisibility(t, dt);

      for (let i = 0; i < count; i++) {
        const dn = dotNoise[i];
        const wave = Math.sin(t * (0.08 + dn * 0.12) + dn * 30.0);
        dotVisTarget[i] = wave > 0.1 ? 1.0 : 0.0;
        const spd = dotVisTarget[i] > dotVis[i] ? 5.0 : 8.0;
        dotVis[i] = THREE.MathUtils.lerp(dotVis[i], dotVisTarget[i], 1 - Math.exp(-spd * dt));
      }

      const attack = 12.0;
      const decay = 10.0;
      for (let i = 0; i < count; i++) {
        const k = target[i] > energy[i] ? attack : decay;
        energy[i] = THREE.MathUtils.lerp(energy[i], target[i], 1 - Math.exp(-k * dt));
      }

      for (let i = 0; i < count; i++) {
        const ca = cellActive[i];
        const bx = basePos[i * 3];
        const by = basePos[i * 3 + 1];
        const bz = basePos[i * 3 + 2];
        const faceIdx = Math.floor(i / (FACE_COLS * FACE_ROWS));
        const fd = faceDefs[faceIdx];

        if (ca < 0.01) {
          squareColors[i * 3] = squareColors[i * 3 + 1] = squareColors[i * 3 + 2] = palette.off;
          pos.set(bx, by, bz);
          scl.set(0, 0, 1);
          m.compose(pos, fd.quat, scl);
          squareMesh.setMatrixAt(i, m);
          dotMesh.setMatrixAt(i, m);
          dotColors[i * 3] = dotColors[i * 3 + 1] = dotColors[i * 3 + 2] = palette.off;
          continue;
        }

        const e = energy[i];
        const variation = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(noise[i] * 100.0 + t * 0.15));
        const v = e * 0.55 * ca * variation;
        const sv = dark ? v : Math.max(0, 1.0 - v * LIGHT_CONTRAST);
        squareColors[i * 3] = squareColors[i * 3 + 1] = squareColors[i * 3 + 2] = sv;

        const sz = dotSize * ca;
        pos.set(bx, by, bz);
        scl.set(sz, sz, 1);
        m.compose(pos, fd.quat, scl);
        squareMesh.setMatrixAt(i, m);

        const isBlack = e < 0.08 && ca > 0.99;
        const dv = isBlack ? dotVis[i] : 0;
        const ds = dv * miniDotSize;
        pos.set(bx + fd.normal.x * 0.002, by + fd.normal.y * 0.002, bz + fd.normal.z * 0.002);
        scl.set(ds, ds, 1);
        m.compose(pos, fd.quat, scl);
        dotMesh.setMatrixAt(i, m);

        const tone = dv * 0.18;
        const dt2 = dark ? tone : Math.max(0, 1.0 - tone * LIGHT_CONTRAST);
        dotColors[i * 3] = dotColors[i * 3 + 1] = dotColors[i * 3 + 2] = dt2;
      }

      squareMesh.instanceMatrix.needsUpdate = true;
      dotMesh.instanceMatrix.needsUpdate = true;
      (squareMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
      (dotMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    }

    let raf: number;
    function animate() {
      raf = requestAnimationFrame(animate);
      step(now());
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      squareGeom.dispose();
      squareMat.dispose();
      squareMesh.dispose();
      dotGeom.dispose();
      dotMat.dispose();
      dotMesh.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      edgesGeom.dispose();
      edgesMat.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
    />
  );
}

