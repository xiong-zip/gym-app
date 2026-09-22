/**
 * 贴纸渲染：把「原图 + 主体遮罩」合成为带白描边与柔影的透明贴纸。
 *
 * 关键点：描边由有符号距离场（SDF）生成，外沿/内沿都做抗锯齿。
 * 早期版本用二值膨胀取描边，边缘是硬台阶，放大全是锯齿；
 * 另外补上了连通域过滤（去掉背景上的零散碎块）与柔影（贴纸的立体感）。
 *
 * 纯像素运算、无平台 API，原生端与 Web 端共用。
 */

export const STICKER_INPUT = 320;    // 分割模型输入边长
export const STICKER_MAX_SIDE = 720; // 贴纸最长边（控制内存与体积）

export interface StickerImage {
  data: Uint8Array; // RGBA
  width: number;
  height: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 单通道 mask 双线性放大 */
export function upscaleMask(src: Float32Array, s: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(s - 1, ((y + 0.5) * s) / h - 0.5);
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(s - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(s - 1, ((x + 0.5) * s) / w - 0.5);
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(s - 1, x0 + 1);
      const wx = fx - x0;
      const top = src[y0 * s + x0] * (1 - wx) + src[y0 * s + x1] * wx;
      const bot = src[y1 * s + x0] * (1 - wx) + src[y1 * s + x1] * wx;
      out[y * w + x] = top * (1 - wy) + bot * wy;
    }
  }
  return out;
}

/** 3×3 盒式模糊（分离式）：抹平 320 网格上采样留下的台阶 */
export function softenMask(mask: Float32Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = x > 0 ? mask[i - 1] : mask[i];
      const r = x < w - 1 ? mask[i + 1] : mask[i];
      tmp[i] = (l + mask[i] + r) / 3;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const u = y > 0 ? tmp[i - w] : tmp[i];
      const d = y < h - 1 ? tmp[i + w] : tmp[i];
      out[i] = (u + tmp[i] + d) / 3;
    }
  }
  return out;
}

/** 只保留主要连通域：去掉背景上零星误检的小块（按面积，4 邻域） */
export function keepMainComponents(bin: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const label = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const sizes: number[] = [];
  let count = 0;
  for (let start = 0; start < n; start++) {
    if (bin[start] === 0 || label[start] !== -1) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = count;
    let size = 0;
    while (head < tail) {
      const i = queue[head++];
      size++;
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0 && bin[i - 1] && label[i - 1] === -1) { label[i - 1] = count; queue[tail++] = i - 1; }
      if (x < w - 1 && bin[i + 1] && label[i + 1] === -1) { label[i + 1] = count; queue[tail++] = i + 1; }
      if (y > 0 && bin[i - w] && label[i - w] === -1) { label[i - w] = count; queue[tail++] = i - w; }
      if (y < h - 1 && bin[i + w] && label[i + w] === -1) { label[i + w] = count; queue[tail++] = i + w; }
    }
    sizes.push(size);
    count++;
  }
  if (count <= 1) return bin;
  const max = Math.max(...sizes);
  const minKeep = Math.max(64, max * 0.05);
  const keep: boolean[] = sizes.map((s) => s >= minKeep);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = label[i] >= 0 && keep[label[i]] ? 1 : 0;
  return out;
}

/** 倒角距离变换：返回每个像素到最近目标像素的近似欧氏距离 */
function distanceTransform(bin: Uint8Array, w: number, h: number, target: number): Float32Array {
  const INF = 1e9;
  const D1 = 1;
  const D2 = 1.4142135;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = bin[i] === target ? 0 : INF;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + D1);
      if (y > 0) {
        v = Math.min(v, d[i - w] + D1);
        if (x > 0) v = Math.min(v, d[i - w - 1] + D2);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + D1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + D1);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2);
        if (x > 0) v = Math.min(v, d[i + w - 1] + D2);
      }
      d[i] = v;
    }
  }
  return d;
}

/** 有符号距离场：主体内为负、外为正（单位约等于像素） */
export function signedDistance(bin: Uint8Array, w: number, h: number): Float32Array {
  const dOut = distanceTransform(bin, w, h, 1); // 到主体的距离（外部有效）
  const dIn = distanceTransform(bin, w, h, 0);  // 到背景的距离（内部有效）
  const sdf = new Float32Array(w * h);
  for (let i = 0; i < sdf.length; i++) sdf[i] = bin[i] ? -dIn[i] : dOut[i];
  return sdf;
}

/** 多次盒式模糊近似高斯（用于柔影） */
function gaussianBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.max(1, radius);
  const norm = 1 / (2 * r + 1);
  const cur = Float32Array.from(src);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += cur[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum * norm;
        sum += cur[row + Math.min(w - 1, x + r + 1)] - cur[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum * norm;
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    cur.set(out);
  }
  return cur;
}

export interface StickerOptions {
  /** 白描边宽度（px），默认按图自适应 */
  border?: number;
}

/**
 * 合成贴纸：主体原色 + 白描边 + 柔影，裁剪到包围盒。
 * @returns null 表示没检出主体
 */
export function renderSticker(
  rgba: Uint8Array,
  w: number,
  h: number,
  mask: Float32Array,
  opts: StickerOptions = {},
): StickerImage | null {
  const soft = softenMask(mask, w, h);
  const raw = new Uint8Array(w * h);
  let inside = 0;
  for (let i = 0; i < raw.length; i++) {
    const v = soft[i] > 0.5 ? 1 : 0;
    raw[i] = v;
    inside += v;
  }
  if (inside < w * h * 0.004) return null;
  const bin = keepMainComponents(raw, w, h);

  const sdf = signedDistance(bin, w, h);
  const short = Math.min(w, h);
  const B = opts.border ?? Math.max(8, Math.min(26, Math.round(short * 0.03))); // 描边宽
  const AA = 1.6;            // 抗锯齿过渡宽度（px）
  // 主体色向内取样的深度：遮罩边界附近的像素本来就是背景，向内取样后由白边覆盖，避免渗色
  const ERODE = Math.max(2, Math.min(5, short * 0.006));
  const shadowSigma = Math.max(2, short * 0.014);
  const shadowDy = Math.max(1, Math.round(short * 0.006));
  const SHADOW_A = 0.26;
  const SHADOW_R = 43, SHADOW_G = 36, SHADOW_B = 22; // 与主题硬阴影同色（墨色）

  // 贴纸实心区域的包围盒，再留出阴影的空间
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (sdf[y * w + x] <= B - AA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const sp = Math.ceil(shadowSigma * 3) + shadowDy + 2;
  minX = Math.max(0, minX - sp); minY = Math.max(0, minY - sp);
  maxX = Math.min(w - 1, maxX + sp); maxY = Math.min(h - 1, maxY + sp);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  // 裁剪区内的贴纸轮廓（作柔影的源）
  const plate = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const d = sdf[(minY + y) * w + (minX + x)];
      plate[y * cw + x] = clamp01(0.5 - (d - B) / AA);
    }
  }
  const shadow = gaussianBlur(plate, cw, ch, Math.round(shadowSigma * 0.7));

  const out = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const ix = minX + x;
      const iy = minY + y;
      const si = iy * w + ix;
      const di = (y * cw + x) * 4;
      const d = sdf[si];
      const aOuter = clamp01(0.5 - (d - B) / AA);   // 白底板
      const aSub = clamp01(0.5 - d / AA);           // 主体
      const tCol = clamp01(0.5 - (d + ERODE * 0.3) / AA); // 主体色→白的过渡

      // 边界带内沿距离场梯度向内取样颜色：遮罩外的背景像素不会渗进贴纸边缘
      let cr = rgba[si * 4];
      let cg = rgba[si * 4 + 1];
      let cb = rgba[si * 4 + 2];
      if (d > -ERODE * 2 && d < 0.5) {
        const xl = ix > 0 ? ix - 1 : ix;
        const xr = ix < w - 1 ? ix + 1 : ix;
        const yu = iy > 0 ? iy - 1 : iy;
        const yd = iy < h - 1 ? iy + 1 : iy;
        const gx = sdf[iy * w + xr] - sdf[iy * w + xl];
        const gy = sdf[yd * w + ix] - sdf[yu * w + ix];
        const gl = Math.sqrt(gx * gx + gy * gy);
        if (gl > 0.0001) {
          let fx = ix - (gx / gl) * ERODE;
          let fy = iy - (gy / gl) * ERODE;
          fx = fx < 0 ? 0 : fx > w - 1 ? w - 1 : fx;
          fy = fy < 0 ? 0 : fy > h - 1 ? h - 1 : fy;
          const x0 = Math.floor(fx);
          const y0 = Math.floor(fy);
          const x1 = x0 + 1 < w ? x0 + 1 : x0;
          const y1 = y0 + 1 < h ? y0 + 1 : y0;
          const wx = fx - x0;
          const wy = fy - y0;
          const o00 = (y0 * w + x0) * 4, o10 = (y0 * w + x1) * 4;
          const o01 = (y1 * w + x0) * 4, o11 = (y1 * w + x1) * 4;
          cr = (rgba[o00] * (1 - wx) + rgba[o10] * wx) * (1 - wy) + (rgba[o01] * (1 - wx) + rgba[o11] * wx) * wy;
          cg = (rgba[o00 + 1] * (1 - wx) + rgba[o10 + 1] * wx) * (1 - wy) + (rgba[o01 + 1] * (1 - wx) + rgba[o11 + 1] * wx) * wy;
          cb = (rgba[o00 + 2] * (1 - wx) + rgba[o10 + 2] * wx) * (1 - wy) + (rgba[o01 + 2] * (1 - wx) + rgba[o11 + 2] * wx) * wy;
        }
      }
      // 边缘向白过渡，与描边无缝相接
      const wr = 255 + (cr - 255) * tCol;
      const wg = 255 + (cg - 255) * tCol;
      const wb = 255 + (cb - 255) * tCol;

      // 主体叠在白底板之上
      const aSticker = aSub + aOuter * (1 - aSub);
      const invS = aSticker > 0 ? 1 / aSticker : 0;
      const sR = (wr * aSub + 255 * aOuter * (1 - aSub)) * invS;
      const sG = (wg * aSub + 255 * aOuter * (1 - aSub)) * invS;
      const sB = (wb * aSub + 255 * aOuter * (1 - aSub)) * invS;

      // 柔影垫在最下面（按偏移采样）
      const py = y - shadowDy;
      const shA = py >= 0 && py < ch ? shadow[py * cw + x] * SHADOW_A : 0;

      const a = aSticker + shA * (1 - aSticker);
      if (a <= 0.001) continue;
      const invA = 1 / a;
      out[di] = Math.round((sR * aSticker + SHADOW_R * shA * (1 - aSticker)) * invA);
      out[di + 1] = Math.round((sG * aSticker + SHADOW_G * shA * (1 - aSticker)) * invA);
      out[di + 2] = Math.round((sB * aSticker + SHADOW_B * shA * (1 - aSticker)) * invA);
      out[di + 3] = Math.round(a * 255);
    }
  }
  return { data: out, width: cw, height: ch };
}
