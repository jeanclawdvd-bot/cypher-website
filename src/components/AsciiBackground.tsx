'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import * as THREE from 'three';

type TalkEvent =
  | { kind: 'pulse'; x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; width: number; strength: number }
  | { kind: 'burst'; cx: number; cy: number; r: number; t0: number; dur: number; strength: number };

type Options = {
  className?: string;
};

const COL_SECTIONS = 1;
const COLS_PER_SECTION = 108;
const COLS = COL_SECTIONS * COLS_PER_SECTION;
const ROW_SECTIONS = 5;
const ROWS_PER_SECTION = 10;
const ROWS = ROW_SECTIONS * ROWS_PER_SECTION;
const DOT_SCALE = 0.78;
const CELL_SPACING = 1.0;
const SECTION_GAP = 2;

const THEME_PALETTES = {
  dark: { bg: 0x000000, off: 0 },
  light: { bg: 0xffffff, off: 1 },
} as const;
const LIGHT_CONTRAST = 1.5;

function rowOffsetUnits(row: number): number {
  const section = Math.floor(row / ROWS_PER_SECTION);
  return row + section * (SECTION_GAP - 1);
}

function colOffsetUnits(col: number): number {
  const section = Math.floor(col / COLS_PER_SECTION);
  return col + section * (SECTION_GAP - 1);
}

export function AsciiPanel({ className }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const isDarkRef = useRef(resolvedTheme !== 'light');

  useEffect(() => {
    isDarkRef.current = resolvedTheme !== 'light';
  }, [resolvedTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(isDarkRef.current ? 0x000000 : 0xffffff);
    scene.background = bgColor;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const squareGeom = new THREE.PlaneGeometry(1, 1);
    const squareMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dotGeom = new THREE.PlaneGeometry(1, 1);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const count = COLS * ROWS;
    const squareMesh = new THREE.InstancedMesh(squareGeom, squareMat, count);
    squareMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(squareMesh);
    const dotMesh = new THREE.InstancedMesh(dotGeom, dotMat, count);
    dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(dotMesh);

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
    const cellX = new Float32Array(count);
    const cellY = new Float32Array(count);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    const dotSize = CELL_SPACING * DOT_SCALE;
    const miniDotSize = dotSize * 0.22;
    const maxRowOffset = rowOffsetUnits(ROWS - 1);
    const maxColOffset = colOffsetUnits(COLS - 1);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        const x = (colOffsetUnits(col) - maxColOffset / 2) * CELL_SPACING;
        const y = -((rowOffsetUnits(row) - maxRowOffset / 2) * CELL_SPACING);
        cellX[i] = x;
        cellY[i] = y;

        pos.set(x, y, 0);
        scl.set(dotSize, dotSize, 1);
        m.compose(pos, quat, scl);
        squareMesh.setMatrixAt(i, m);

        pos.set(x, y, 0.001);
        scl.set(0, 0, 1);
        m.compose(pos, quat, scl);
        dotMesh.setMatrixAt(i, m);

        energy[i] = 1;
        target[i] = 0;
        noise[i] = Math.random();
        dotNoise[i] = Math.random();
        dotVis[i] = Math.random() > 0.5 ? 1 : 0;
        dotVisTarget[i] = dotVis[i];
      }
    }
    squareMesh.instanceMatrix.needsUpdate = true;
    dotMesh.instanceMatrix.needsUpdate = true;

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);

      const gridW = maxColOffset * CELL_SPACING;
      const gridH = maxRowOffset * CELL_SPACING;
      const margin = CELL_SPACING * 1.2;
      const viewW = gridW + 2 * margin;
      const viewH = gridH + 2 * margin;

      const containerAspect = w / h;
      const gridAspect = viewW / viewH;

      if (containerAspect > gridAspect) {
        const halfH = viewH / 2;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.left = -halfH * containerAspect;
        camera.right = halfH * containerAspect;
      } else {
        const halfW = viewW / 2;
        camera.left = -halfW;
        camera.right = halfW;
        camera.top = halfW / containerAspect;
        camera.bottom = -halfW / containerAspect;
      }
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const events: TalkEvent[] = [];
    const now = () => performance.now() * 0.001;

    function spawnPulse() {
      events.push({
        kind: 'pulse',
        x0: Math.floor(Math.random() * COLS),
        y0: Math.floor(Math.random() * ROWS),
        x1: Math.floor(Math.random() * COLS),
        y1: Math.floor(Math.random() * ROWS),
        t0: now(),
        dur: THREE.MathUtils.randFloat(3.0, 6.0),
        width: THREE.MathUtils.randFloat(3.0, 7.0),
        strength: THREE.MathUtils.randFloat(0.3, 0.7),
      });
    }

    function spawnBurst() {
      events.push({
        kind: 'burst',
        cx: Math.floor(Math.random() * COLS),
        cy: Math.floor(Math.random() * ROWS),
        r: THREE.MathUtils.randFloat(5.0, 20.0),
        t0: now(),
        dur: THREE.MathUtils.randFloat(2.0, 4.5),
        strength: THREE.MathUtils.randFloat(0.2, 0.5),
      });
    }

    const rowTarget = new Uint8Array(ROWS).fill(1);
    const cellActive = new Float32Array(count).fill(0);
    const cellDelay = new Float32Array(count);
    const cellTriggered = new Float32Array(count);
    const ROW_OFF_RATIO = 0.08;
    const CELL_FADE_SPEED = 6.0;
    const STAGGER_SPREAD = 0.8;
    const LOAD_ROW_INTERVAL = 0.04;

    const startTime = now();
    for (let i = 0; i < count; i++) {
      cellDelay[i] = Math.random() * STAGGER_SPREAD;
      const row = Math.floor(i / COLS);
      cellTriggered[i] = startTime + row * LOAD_ROW_INTERVAL + cellDelay[i];
    }

    const offCount = Math.round(ROWS * ROW_OFF_RATIO);
    const shuffled = Array.from({ length: ROWS }, (_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const loadDuration = ROWS * LOAD_ROW_INTERVAL + STAGGER_SPREAD + 1.0;
    for (let i = 0; i < offCount; i++) {
      rowTarget[shuffled[i]] = 0;
    }

    let activeSection = Math.floor(Math.random() * ROW_SECTIONS);
    let nextRowFlip = startTime + loadDuration + THREE.MathUtils.randFloat(2.0, 5.0);
    let nextSectionSwitch = startTime + loadDuration + THREE.MathUtils.randFloat(6.0, 12.0);

    function triggerRow(row: number, t: number) {
      const base = row * COLS;
      for (let c = 0; c < COLS; c++) {
        cellTriggered[base + c] = t + cellDelay[base + c];
      }
    }

    function sectionRows(s: number): [number, number] {
      return [s * ROWS_PER_SECTION, (s + 1) * ROWS_PER_SECTION];
    }

    function updateRowVisibility(t: number, dt: number) {
      if (t >= nextSectionSwitch) {
        nextSectionSwitch = t + THREE.MathUtils.randFloat(6.0, 12.0);
        let next = Math.floor(Math.random() * ROW_SECTIONS);
        while (next === activeSection && ROW_SECTIONS > 1) {
          next = Math.floor(Math.random() * ROW_SECTIONS);
        }
        activeSection = next;
      }

      if (t >= nextRowFlip) {
        nextRowFlip = t + THREE.MathUtils.randFloat(1.5, 4.0);

        const [rStart, rEnd] = sectionRows(activeSection);
        const onRows: number[] = [];
        const offRows: number[] = [];
        for (let r = rStart; r < rEnd; r++) {
          if (rowTarget[r] === 1) onRows.push(r);
          else offRows.push(r);
        }

        const maxOff = Math.max(1, Math.round(ROWS_PER_SECTION * ROW_OFF_RATIO));
        if (onRows.length > 0 && offRows.length < maxOff + 1) {
          const pick = onRows[Math.floor(Math.random() * onRows.length)];
          rowTarget[pick] = 0;
          triggerRow(pick, t);
        }
        if (offRows.length > 0) {
          const pick = offRows[Math.floor(Math.random() * offRows.length)];
          rowTarget[pick] = 1;
          triggerRow(pick, t);
        }
      }

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / COLS);
        const tgt = rowTarget[row];
        if (t < cellTriggered[i]) continue;
        const cur = cellActive[i];
        if (tgt === 1 && cur < 1) {
          cellActive[i] = Math.min(1, cur + CELL_FADE_SPEED * dt);
        } else if (tgt === 0 && cur > 0) {
          cellActive[i] = Math.max(0, cur - CELL_FADE_SPEED * dt);
        }
      }
    }

    for (let i = 0; i < 2; i++) spawnPulse();
    spawnBurst();

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
        if (age >= ev.dur) {
          events.splice(e, 1);
          continue;
        }
        const a = age / ev.dur;

        if (ev.kind === 'pulse') {
          const { x0, y0, x1, y1, width, strength } = ev;
          const p = a * a * (3 - 2 * a);
          const px = THREE.MathUtils.lerp(x0, x1, p);
          const py = THREE.MathUtils.lerp(y0, y1, p);

          for (let i = 0; i < count; i++) {
            const gx = i % COLS;
            const gy = Math.floor(i / COLS);
            const dx = gx - px;
            const dy = gy - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            const g = Math.exp(-(d * d) / (2 * width * width));
            target[i] = Math.max(target[i], g * strength);
          }
        } else {
          const { cx, cy, r, strength } = ev;
          const ring = THREE.MathUtils.lerp(0.5, r, a);
          const thickness = 2.5;

          for (let i = 0; i < count; i++) {
            const gx = i % COLS;
            const gy = Math.floor(i / COLS);
            const dx = gx - cx;
            const dy = gy - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            const band = Math.exp(-((d - ring) * (d - ring)) / (2 * thickness * thickness));
            target[i] = Math.max(target[i], band * strength);
          }
        }
      }

      if (events.length < 3 && Math.random() < 0.02) spawnPulse();
      if (events.length < 3 && Math.random() < 0.01) spawnBurst();
    }

    function step(t: number) {
      const dt = Math.min(0.033, Math.max(0.001, t - lastT));
      lastT = t;

      const dark = isDarkRef.current;
      const palette = dark ? THEME_PALETTES.dark : THEME_PALETTES.light;
      bgColor.set(palette.bg);

      updateTargets(t);
      updateRowVisibility(t, dt);

      for (let i = 0; i < count; i++) {
        const dn = dotNoise[i];
        const wave = Math.sin(t * (0.08 + dn * 0.12) + dn * 30.0);
        dotVisTarget[i] = wave > 0.1 ? 1.0 : 0.0;
        const cur = dotVis[i];
        const tgt = dotVisTarget[i];
        const spd = tgt > cur ? 5.0 : 8.0;
        dotVis[i] = THREE.MathUtils.lerp(cur, tgt, 1 - Math.exp(-spd * dt));
      }

      const attack = 12.0;
      const decay = 10.0;
      for (let i = 0; i < count; i++) {
        const tgt = target[i];
        const cur = energy[i];
        const k = tgt > cur ? attack : decay;
        energy[i] = THREE.MathUtils.lerp(cur, tgt, 1 - Math.exp(-k * dt));
      }

      for (let i = 0; i < count; i++) {
        const ca = cellActive[i];

        if (ca < 0.01) {
          squareColors[i * 3 + 0] = palette.off;
          squareColors[i * 3 + 1] = palette.off;
          squareColors[i * 3 + 2] = palette.off;

          pos.set(cellX[i], cellY[i], 0);
          scl.set(0, 0, 1);
          m.compose(pos, quat, scl);
          squareMesh.setMatrixAt(i, m);

          pos.set(cellX[i], cellY[i], 0.001);
          scl.set(0, 0, 1);
          m.compose(pos, quat, scl);
          dotMesh.setMatrixAt(i, m);

          dotColors[i * 3 + 0] = palette.off;
          dotColors[i * 3 + 1] = palette.off;
          dotColors[i * 3 + 2] = palette.off;
          continue;
        }

        const e = energy[i];
        const variation = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(noise[i] * 100.0 + t * 0.15));
        const v = e * 0.55 * ca * variation;
        const sv = dark ? v : Math.max(0, 1.0 - v * LIGHT_CONTRAST);
        squareColors[i * 3 + 0] = sv;
        squareColors[i * 3 + 1] = sv;
        squareColors[i * 3 + 2] = sv;

        const sz = dotSize * ca;
        pos.set(cellX[i], cellY[i], 0);
        scl.set(sz, sz, 1);
        m.compose(pos, quat, scl);
        squareMesh.setMatrixAt(i, m);

        const isBlack = e < 0.08 && ca > 0.99;
        const dv = isBlack ? dotVis[i] : 0;
        const ds = dv * miniDotSize;
        pos.set(cellX[i], cellY[i], 0.001);
        scl.set(ds, ds, 1);
        m.compose(pos, quat, scl);
        dotMesh.setMatrixAt(i, m);

        const tone = dv * 0.18;
        const dt2 = dark ? tone : Math.max(0, 1.0 - tone * LIGHT_CONTRAST);
        dotColors[i * 3 + 0] = dt2;
        dotColors[i * 3 + 1] = dt2;
        dotColors[i * 3 + 2] = dt2;
      }

      squareMesh.instanceMatrix.needsUpdate = true;
      dotMesh.instanceMatrix.needsUpdate = true;
      (squareMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
      (dotMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    }

    let raf: number;

    function animate() {
      raf = requestAnimationFrame(animate);
      const t = now();
      step(t);
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

export const AsciiBackground = AsciiPanel;
