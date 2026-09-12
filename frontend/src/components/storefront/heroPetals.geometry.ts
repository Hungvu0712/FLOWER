import * as THREE from 'three';

// Sinh hình cánh hoa THẬT bằng lưới tham số hoá (custom BufferGeometry) — KHÔNG dùng PlaneGeometry
// hình vuông. Mỗi cánh là 1 lưới (xSegments+1) × (ySegments+1) đỉnh, width tại mỗi "độ cao" v (0 =
// gốc, 1 = đầu cánh) được tính theo 1 profile phồng ở giữa rồi thu nhỏ về gốc/đầu — xem widthAt().
// Độ cong 3D (curvature) cộng thêm vào trục Z (dọc theo chiều dài) + trục X (vênh nhẹ theo chiều dài,
// tạo cảm giác cánh hơi xoắn) để không phẳng hoàn toàn — đúng yêu cầu "hơi cong theo X/Y/Z".
export type PetalVariant = {
  /** Độ rộng lớn nhất của cánh (tại điểm phồng) */
  maxWidth: number;
  /** Chiều dài cánh, gốc tại y=0, đầu tại y=length */
  length: number;
  /** Vị trí điểm phồng nhất theo chiều dài, 0-1 (petal thật thường phồng ở khoảng 35-55%) */
  peakV: number;
  /** 0 = đầu nhọn hẳn, ~0.14 = đầu bo mềm */
  tipSharpness: number;
  /** Độ cong dọc theo chiều dài (mép cong ra ngoài mặt phẳng) */
  bendAmount: number;
  /** Độ "úp" (cupping) ngang qua bề rộng — cánh hoa hiếm khi phẳng ngang */
  cupAmount: number;
  /** Vênh nhẹ theo X dọc chiều dài — tạo cảm giác xoắn tự nhiên, không đối xứng hoàn hảo */
  twistAmount: number;
};

// 4 variation — khác nhau về tỉ lệ/độ cong để tránh mọi cánh hoa giống hệt nhau (yêu cầu đề bài).
export const PETAL_VARIANTS: PetalVariant[] = [
  {
    maxWidth: 1.15,
    length: 2.6,
    peakV: 0.42,
    tipSharpness: 0.04,
    bendAmount: 0.34,
    cupAmount: 0.22,
    twistAmount: 0.12,
  },
  {
    maxWidth: 0.95,
    length: 2.2,
    peakV: 0.5,
    tipSharpness: 0.16,
    bendAmount: 0.26,
    cupAmount: 0.16,
    twistAmount: -0.08,
  },
  {
    maxWidth: 1.3,
    length: 2.9,
    peakV: 0.38,
    tipSharpness: 0.02,
    bendAmount: 0.42,
    cupAmount: 0.28,
    twistAmount: 0.18,
  },
  {
    maxWidth: 1.0,
    length: 2.35,
    peakV: 0.48,
    tipSharpness: 0.2,
    bendAmount: 0.2,
    cupAmount: 0.12,
    twistAmount: -0.14,
  },
];

function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}
function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

// Width tại "độ cao" v (0 = gốc, 1 = đầu) — gốc hẹp, phồng dần tới peakV, rồi thu lại về đầu (nhọn
// hoặc bo mềm tuỳ tipSharpness). Đây là silhouette cốt lõi khiến hình trông giống cánh hoa thật.
function widthAt(v: number, variant: PetalVariant): number {
  const baseWidth = variant.maxWidth * 0.06; // gốc không hoàn toàn = 0 (petal thật vẫn có chút bề rộng ở gốc)
  const tipWidth = variant.maxWidth * variant.tipSharpness;
  if (v <= variant.peakV) {
    const t = v / variant.peakV;
    return baseWidth + (variant.maxWidth - baseWidth) * easeOutSine(t);
  }
  const t = (v - variant.peakV) / (1 - variant.peakV);
  return variant.maxWidth + (tipWidth - variant.maxWidth) * easeInSine(t);
}

const X_SEGMENTS = 8;
const Y_SEGMENTS = 14;

// Custom BufferGeometry — lưới (X_SEGMENTS+1)×(Y_SEGMENTS+1) đỉnh, đủ mịn để bend cong mượt (không
// dùng ShapeGeometry vì mật độ đỉnh của nó bám theo outline, không đều để uốn cong đẹp). Gốc cánh ở
// y=0 (điểm pivot xoay/rơi), đầu cánh ở y=length.
export function createPetalGeometry(variant: PetalVariant): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= Y_SEGMENTS; j++) {
    const v = j / Y_SEGMENTS;
    const width = widthAt(v, variant);
    const y = v * variant.length;
    // Cong dọc chiều dài (mép cong ra ngoài) — nửa hình sin, cong nhiều nhất ở giữa-cuối cánh.
    const bendZ = variant.bendAmount * Math.sin(v * Math.PI * 0.85);
    // Vênh nhẹ theo X dọc chiều dài — cánh không đối xứng hoàn hảo, hơi "xoắn".
    const twistX = variant.twistAmount * v * v;

    for (let i = 0; i <= X_SEGMENTS; i++) {
      const u = i / X_SEGMENTS; // 0..1 ngang qua bề rộng
      const uSigned = (u - 0.5) * 2; // -1..1, dùng để tính cupping
      const x = uSigned * (width / 2) + twistX;
      // Úp ngang (cupping) — lõm nhẹ dạng parabol, cao nhất ở tâm, về 0 ở 2 mép.
      const cupZ = variant.cupAmount * (1 - uSigned * uSigned);
      const z = bendZ + cupZ;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < Y_SEGMENTS; j++) {
    for (let i = 0; i < X_SEGMENTS; i++) {
      const a = j * (X_SEGMENTS + 1) + i;
      const b = a + 1;
      const c = a + (X_SEGMENTS + 1);
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Pivot ở gốc cánh (y=0) — mesh xoay/rơi trông giống cánh hoa xoay quanh cuống, không xoay quanh
  // tâm hình học (sẽ trông như xoay 1 mảnh giấy vô hồn).
  geometry.translate(0, -variant.length * 0.18, 0);

  return geometry;
}
