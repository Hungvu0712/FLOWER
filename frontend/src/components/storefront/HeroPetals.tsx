'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createPetalGeometry, PETAL_VARIANTS } from './heroPetals.geometry';

type HeroPetalsProps = {
  /** Section Hero — dùng để đo kích thước/vị trí cho canvas và cho tính toán mouse parallax. */
  sectionRef: React.RefObject<HTMLElement | null>;
  /** Thẻ ảnh bó hoa (HTML, không phải WebGL) — nhận parallax RẤT nhẹ cùng nhịp với cánh hoa. */
  visualRef?: React.RefObject<HTMLDivElement | null>;
};

// Palette pastel ĐÚNG theme "Soft Petal" của Hoa Xinh — dusty rose/blush/cream quanh --color-rose
// (oklch 58% 0.1 20), không thêm màu lạ. Xem globals.css.
const PETAL_COLORS = ['#f6e2df', '#eec4cb', '#e0a3ad', '#c96b72', '#a85560', '#f5ecdb'];

// Quy đổi đơn vị "thiết kế" (~1-3) của geometry sang px thật trong world space (xem resetPetal()).
const PETAL_BASE_SCALE = 46;

type Breakpoint = 'mobile' | 'tablet' | 'desktop';
const PETAL_COUNT: Record<Breakpoint, number> = { mobile: 5, tablet: 9, desktop: 14 };
// Tỉ lệ 3 layer (background/midground/foreground) — foreground CỐ TÌNH ít nhất, "ít cánh nhưng đẹp"
// và tránh rợp lên trên bó hoa/heading.
const LAYER_RATIO: [number, number, number] = [0.36, 0.42, 0.22];

function getBreakpoint(width: number): Breakpoint {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

type SpawnRegion = { xMin: number; xMax: number; yTop: number; yBottom: number };

// >=1024px: layout Hero nằm NGANG (text trái/ảnh phải, xem Hero.tsx `lg:flex-row`) — cánh hoa bay
// lệch về NỬA PHẢI (phía bó hoa), tránh trôi qua vùng heading/CTA bên trái.
// <1024px: layout XẾP DỌC (text trên/ảnh dưới) — cánh hoa bay lệch về NỬA DƯỚI (phía ảnh).
// Đây là cách "không để foreground petals che heading/CTA" mà không cần biết toạ độ DOM chính xác.
function computeSpawnRegion(width: number, height: number, breakpoint: Breakpoint): SpawnRegion {
  const halfW = width / 2;
  const halfH = height / 2;
  if (breakpoint === 'desktop') {
    // xMin đủ dương (> driftAmp tối đa 34 + wind tối đa ~15) để world x KHÔNG BAO GIỜ âm — world x=0
    // đã nằm ngay mép phải vùng chữ heading (do camera lấy tâm Hero làm gốc), nên xMin dương đảm bảo
    // cánh hoa (kể cả lúc trôi lệch nhiều nhất) không bao giờ lấn sang nửa trái có heading/CTA. Trước
    // đó xMin gần 0 (-0.08*halfW) khiến vài cánh foreground lệch quá gần/qua vùng chữ lúc kiểm chứng.
    return { xMin: halfW * 0.15, xMax: halfW * 0.98, yTop: halfH * 1.15, yBottom: -halfH * 1.15 };
  }
  return { xMin: -halfW * 0.9, xMax: halfW * 0.9, yTop: -halfH * 0.05, yBottom: -halfH * 1.35 };
}

type Layer = 0 | 1 | 2;

interface PetalInstance {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  layer: Layer;
  baseOpacity: number;
  baseScale: number;
  spawnTime: number;
  startX: number;
  startY: number;
  fallSpeed: number;
  driftAmp: number;
  driftFreq: number;
  phase: number;
  rot0: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  flutterAmp: number;
  flutterFreq: number;
  windInfluence: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

// Layer quyết định "vẻ ngoài" (to/nhỏ, rõ/mờ, nhanh/chậm) — KHÔNG dùng camera phối cảnh để giả độ sâu
// (dùng OrthographicCamera cho đơn giản/hiệu năng), nên khoảng cách xa-gần được "diễn" trực tiếp qua
// scale + opacity + tốc độ, đúng tinh thần 3 layer của đề bài mà không cần 2 canvas/độ phức tạp thừa.
function layerLook(layer: Layer): {
  scaleRange: [number, number];
  opacityRange: [number, number];
  speedMul: number;
} {
  // opacityRange của layer 0/1 hạ thấp hơn bản đầu — canvas là 1 lớp phủ PHẲNG lên trên toàn bộ
  // Hero (không occlusion DOM thật với ảnh bó hoa), nên nhiều cánh "background" chồng nhau lúc trôi
  // ngang qua ảnh cộng dồn thành 1 lớp mờ phủ lên ảnh thật (rõ hơn hẳn so với icon phẳng lúc test
  // trước đó). Giảm opacity để layer sau vẫn "gợi chiều sâu" mà không làm nhạt màu ảnh.
  if (layer === 0) return { scaleRange: [0.5, 0.72], opacityRange: [0.12, 0.22], speedMul: 0.7 };
  if (layer === 1) return { scaleRange: [0.8, 1.02], opacityRange: [0.32, 0.5], speedMul: 1 };
  return { scaleRange: [1.05, 1.3], opacityRange: [0.72, 0.9], speedMul: 1.25 };
}

function makeLayerForIndex(index: number, total: number): Layer {
  const bgCount = Math.round(total * LAYER_RATIO[0]);
  const midCount = Math.round(total * LAYER_RATIO[1]);
  if (index < bgCount) return 0;
  if (index < bgCount + midCount) return 1;
  return 2;
}

// Gió chậm, hữu cơ (tổng 2 sóng sin lệch pha/tần số) — KHÔNG có 1 chu kỳ hoàn hảo duy nhất nên không
// tạo cảm giác máy móc. Mỗi cánh nhân thêm `windInfluence` riêng nên không bay cùng hướng tuyệt đối.
function windX(t: number): number {
  return Math.sin(t * 0.15) * 10 + Math.sin(t * 0.037 + 2.1) * 5;
}

export function HeroPetals({ sectionRef, visualRef }: HeroPetalsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return; // Hero vẫn hiển thị bình thường, chỉ KHÔNG mount layer hiệu ứng.
    if (!detectWebGL()) return; // Fallback: không có WebGL thì đơn giản là không có lớp cánh hoa.

    let width = section.clientWidth;
    let height = section.clientHeight;
    let breakpoint = getBreakpoint(width);
    let spawnRegion = computeSpawnRegion(width, height, breakpoint);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000,
    );
    camera.position.z = 400;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // updateStyle=false — TỰ set CSS size bằng % thay vì để Three.js gán cứng px (tránh phải set lại
    // style mỗi lần resize). Thiếu bước set style này là BUG thật gặp phải lúc kiểm chứng: canvas
    // hiển thị đúng bằng kích thước BUFFER (đã nhân pixelRatio) thay vì kích thước CSS mong muốn,
    // khiến cảnh 3D bị "phóng to" lệch hẳn ra ngoài vùng nhìn thấy của khung Hero.
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.setClearColor(0x000000, 0); // canvas trong suốt — chỉ thấy cánh hoa, không có nền riêng
    container.appendChild(renderer.domElement);

    // Ánh sáng mềm kiểu studio/ánh sáng cửa sổ — KHÔNG màu sắc kịch tính, không neon.
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const hemi = new THREE.HemisphereLight(0xfff3ee, 0xe8d6cf, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff7f2, 0.7);
    sun.position.set(120, 220, 260);
    scene.add(sun);

    const petalsGroup = new THREE.Group();
    scene.add(petalsGroup);

    // Reuse geometry — 4 variation tạo SẴN 1 lần, mọi petal (dù rebuild theo breakpoint) đều tham
    // chiếu lại đúng 4 geometry này, không bao giờ tạo geometry mới sau init.
    const geometries = PETAL_VARIANTS.map((v) => createPetalGeometry(v));

    const petals: PetalInstance[] = [];
    let clock = new THREE.Clock();
    let elapsed = 0;

    function resetPetal(p: PetalInstance, now: number, isInitial: boolean) {
      const look = layerLook(p.layer);
      p.startX = rand(spawnRegion.xMin, spawnRegion.xMax);
      p.startY = isInitial ? rand(spawnRegion.yBottom, spawnRegion.yTop) : spawnRegion.yTop;
      // px/giây — hiệu chỉnh theo khoảng cách rơi thật (yTop→yBottom, ~800-1000px ở desktop) để 1
      // vòng rơi mất ĐÚNG khoảng 8–15s như đề bài (v6-16 trước đó quá chậm — soi thử mới thấy mất
      // gần cả phút mới rơi hết, xem ghi chú kiểm chứng lúc build).
      p.fallSpeed = rand(55, 110) * look.speedMul;
      p.driftAmp = rand(10, 34);
      p.driftFreq = rand(0.25, 0.6);
      p.phase = rand(0, Math.PI * 2);
      p.rot0.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
      p.rotSpeed.set(rand(-0.25, 0.25), rand(-0.2, 0.2), rand(-0.3, 0.3));
      p.flutterAmp = rand(0.15, 0.4);
      p.flutterFreq = rand(0.4, 1.1);
      p.windInfluence = rand(0.55, 1.45);
      p.baseOpacity = rand(look.opacityRange[0], look.opacityRange[1]);
      // OrthographicCamera dùng 1 world unit = 1px (frustum = kích thước Hero tính bằng px), nhưng
      // geometry cánh hoa được vẽ ở đơn vị "thiết kế" trừu tượng (~1-3, xem heroPetals.geometry.ts)
      // — PETAL_BASE_SCALE quy đổi ra kích thước px thật, tách khỏi scale theo layer (to/nhỏ).
      const scale = rand(look.scaleRange[0], look.scaleRange[1]) * PETAL_BASE_SCALE;
      p.baseScale = scale;
      p.mesh.scale.setScalar(scale);
      // Stagger lúc khởi tạo (0.6–1.8s, đề bài) — reset sau đó luôn spawn ngay (spawnTime = now).
      p.spawnTime = isInitial ? rand(0.6, 1.8) : now;
      p.mesh.position.set(p.startX, p.startY, p.layer * 18 - 18);
    }

    function buildPetals(count: number) {
      // Dispose đúng petal MESH + MATERIAL cũ (không đụng 4 geometry dùng chung) trước khi build lại
      // theo breakpoint mới — tránh rebuild mỗi lần resize (chỉ khi ĐỔI breakpoint, xem onResize).
      for (const p of petals) {
        petalsGroup.remove(p.mesh);
        p.material.dispose();
      }
      petals.length = 0;

      for (let i = 0; i < count; i++) {
        const layer = makeLayerForIndex(i, count);
        const geometry = geometries[i % geometries.length]!;
        const color = PETAL_COLORS[Math.floor(rand(0, PETAL_COLORS.length))]!;
        const material = new THREE.MeshStandardMaterial({
          color,
          roughness: rand(0.55, 0.8),
          metalness: 0,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false, // tránh viền/artefact khi nhiều cánh trong suốt chồng lên nhau
        });
        const mesh = new THREE.Mesh(geometry, material);
        petalsGroup.add(mesh);

        const petal: PetalInstance = {
          mesh,
          material,
          layer,
          baseOpacity: 0.6,
          baseScale: 1,
          spawnTime: 0,
          startX: 0,
          startY: 0,
          fallSpeed: 10,
          driftAmp: 20,
          driftFreq: 0.4,
          phase: 0,
          rot0: new THREE.Vector3(),
          rotSpeed: new THREE.Vector3(),
          flutterAmp: 0.2,
          flutterFreq: 0.6,
          windInfluence: 1,
        };
        resetPetal(petal, elapsed, true);
        petals.push(petal);
      }
    }

    buildPetals(PETAL_COUNT[breakpoint]);

    // ---- Mouse parallax (tắt trên mobile) — lerp mượt, không làm layout rung -----------------
    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };
    let parallaxEnabled = breakpoint !== 'mobile';

    function onMouseMove(e: MouseEvent) {
      if (!parallaxEnabled || !section) return;
      const rect = section.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;
      mouseTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseTarget.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }
    window.addEventListener('mousemove', onMouseMove);

    // ---- Resize (debounced) — chỉ rebuild pool petal khi ĐỔI breakpoint, luôn cập nhật camera/size ----
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function applyResize() {
      if (!section) return;
      width = section.clientWidth;
      height = section.clientHeight;
      const nextBreakpoint = getBreakpoint(width);
      spawnRegion = computeSpawnRegion(width, height, nextBreakpoint);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      if (nextBreakpoint !== breakpoint) {
        breakpoint = nextBreakpoint;
        parallaxEnabled = breakpoint !== 'mobile';
        buildPetals(PETAL_COUNT[breakpoint]);
      }
    }
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyResize, 150);
    }
    window.addEventListener('resize', onResize);

    // ---- Pause khi tab ẩn — tiết kiệm CPU/GPU, không animate vô ích ----------------------------
    let running = true;
    function onVisibilityChange() {
      running = document.visibilityState === 'visible';
      if (running) clock = new THREE.Clock(); // reset clock — tránh dt "nhảy cóc" sau khi quay lại tab
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ---- Animation loop -------------------------------------------------------------------------
    let rafId = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.1); // clamp — chống giật khi tab vừa active lại
      elapsed += dt;

      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.08;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.08;
      petalsGroup.position.x = mouseCurrent.x * 14;
      petalsGroup.position.y = -mouseCurrent.y * 9;
      petalsGroup.rotation.y = mouseCurrent.x * 0.025;
      petalsGroup.rotation.x = mouseCurrent.y * 0.018;
      if (visualRef?.current) {
        visualRef.current.style.transform = `translate3d(${mouseCurrent.x * 9}px, ${mouseCurrent.y * -6}px, 0)`;
      }

      const wind = windX(elapsed);
      const fadeMargin = 60;

      for (const p of petals) {
        const localT = elapsed - p.spawnTime;
        if (localT < 0) {
          p.material.opacity = 0;
          continue;
        }

        const y = p.startY - p.fallSpeed * localT;
        const x =
          p.startX + Math.sin(localT * p.driftFreq + p.phase) * p.driftAmp + wind * p.windInfluence;
        p.mesh.position.x = x;
        p.mesh.position.y = y;

        p.mesh.rotation.x = p.rot0.x + localT * p.rotSpeed.x;
        p.mesh.rotation.y = p.rot0.y + localT * p.rotSpeed.y;
        p.mesh.rotation.z =
          p.rot0.z +
          localT * p.rotSpeed.z +
          Math.sin(localT * p.flutterFreq + p.phase) * p.flutterAmp;

        // Fade in ngay sau spawn + fade out ngay trước khi reset — che dấu thời điểm reset hoàn toàn.
        const fadeIn = THREE.MathUtils.clamp((spawnRegion.yTop - y) / fadeMargin, 0, 1);
        const fadeOut = THREE.MathUtils.clamp((y - spawnRegion.yBottom) / fadeMargin, 0, 1);
        p.material.opacity = p.baseOpacity * Math.min(fadeIn, fadeOut);

        if (y < spawnRegion.yBottom) {
          resetPetal(p, elapsed, false);
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      for (const p of petals) p.material.dispose();
      for (const g of geometries) g.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs ổn định, chỉ chạy 1 lần khi mount
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    />
  );
}
