/**
 * Web 端主体抠图（描边贴纸）：与原生端同一套 u2netp 分割模型。
 * onnxruntime-web 的 npm 包含 Metro 无法转换的动态 import 表达式，
 * 这里改为运行时从 CDN 注入 ort 脚本（window.ort），不进打包产物：
 * 照片 → 主体遮罩 → 外扩白描边 → 透明 PNG（data URI）贴纸。
 * CDN/模型加载失败时返回 null，调用方回退为整张照片贴纸。
 */
import { Asset } from 'expo-asset';
import type { CutoutResult } from './cutout.types';

export type { CutoutResult };

const INPUT = 320;      // 模型输入边长
const MAX_SIDE = 720;   // 贴纸最大边
// CDN 多源依次尝试（jsdelivr 在部分网络不可达，npmmirror 国内最稳）
const ORT_CDNS = [
  'https://registry.npmmirror.com/onnxruntime-web/1.19.2/files/dist',
  'https://unpkg.com/onnxruntime-web@1.19.2/dist',
];

/* eslint-disable @typescript-eslint/no-explicit-any */
type OrtSession = {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array }>>;
};
type Ort = {
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(uri: string, opts?: unknown): Promise<OrtSession> };
  env: { wasm: { numThreads: number; wasmPaths?: string } };
};

let ortP: Promise<Ort> | null = null;

/** 依次从各 CDN 注入 ort 脚本，加载成功后缓存 ort 对象（含 wasm 路径指向同一 CDN） */
function loadOrt(): Promise<Ort> {
  if (!ortP) {
    ortP = (async () => {
      const w = window as unknown as { ort?: Ort };
      if (w.ort) return w.ort;
      let lastErr: unknown = null;
      for (const cdn of ORT_CDNS) {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${cdn}/ort.min.js`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('ort-cdn'));
            document.head.appendChild(script);
          });
          const ort = (window as unknown as { ort?: Ort }).ort;
          if (!ort) throw new Error('ort-missing');
          try {
            ort.env.wasm.numThreads = 1;
            ort.env.wasm.wasmPaths = `${cdn}/`;
          } catch { /* 环境配置失败不致命 */ }
          return ort;
        } catch (e) {
          lastErr = e;
        }
      }
      ortP = null;
      throw lastErr ?? new Error('ort-load');
    })();
  }
  return ortP;
}

let sessionP: Promise<OrtSession> | null = null;

async function loadSession(ort: Ort): Promise<OrtSession> {
  if (!sessionP) {
    sessionP = (async () => {
      const asset = Asset.fromModule(require('../../assets/models/u2netp.onnx'));
      await asset.downloadAsync();
      if (!asset.uri) throw new Error('no-model-uri');
      return ort.InferenceSession.create(asset.uri, { executionMode: 'sequential' });
    })().catch((e) => {
      sessionP = null;
      throw e;
    });
  }
  return sessionP;
}

/** data URI → HTMLImageElement（浏览器解码 JPEG/PNG） */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img-decode'));
    img.src = src;
  });
}

/** 盒状膨胀（分离式 max filter，迭代 r 次近似半径 r）——与原生端同款 */
function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  let cur = mask;
  for (let it = 0; it < r; it++) {
    const tmp = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 1; x < w; x++) tmp[y * w + x] = Math.max(cur[y * w + x], cur[y * w + x - 1]);
      tmp[y * w] = cur[y * w];
    }
    const tmp2 = new Uint8Array(w * h);
    for (let y = 1; y < h; y++) {
      for (let x = 0; x < w; x++) tmp2[y * w + x] = Math.max(tmp[y * w + x], tmp[y * w + x - w]);
    }
    for (let x = 0; x < w; x++) tmp2[x] = tmp[x];
    cur = tmp2;
  }
  return cur;
}

/** 单通道 mask 双线性放大 */
function upscaleMask(src: Float32Array, s: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(s - 1, (y + 0.5) * s / h - 0.5);
    const y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(s - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(s - 1, (x + 0.5) * s / w - 0.5);
      const x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(s - 1, x0 + 1), wx = fx - x0;
      const top = src[y0 * s + x0] * (1 - wx) + src[y0 * s + x1] * wx;
      const bot = src[y1 * s + x0] * (1 - wx) + src[y1 * s + x1] * wx;
      out[y * w + x] = top * (1 - wy) + bot * wy;
    }
  }
  return out;
}

export async function cutoutSticker(src: string): Promise<CutoutResult | null> {
  try {
    const ort = await loadOrt();

    // 1. 解码并限制尺寸
    const img = await loadImage(src);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(8, Math.round(img.width * scale));
    const h = Math.max(8, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const rgba = new Uint8Array(ctx.getImageData(0, 0, w, h).data);

    // 2. 模型输入：缩到 320²，ImageNet 归一化
    const inCanvas = document.createElement('canvas');
    inCanvas.width = INPUT; inCanvas.height = INPUT;
    const inCtx = inCanvas.getContext('2d', { willReadFrequently: true });
    if (!inCtx) return null;
    inCtx.drawImage(img, 0, 0, INPUT, INPUT);
    const small = inCtx.getImageData(0, 0, INPUT, INPUT).data;
    const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
    const n = INPUT * INPUT;
    const data = new Float32Array(3 * n);
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      data[p] = (small[i] / 255 - MEAN[0]) / STD[0];
      data[n + p] = (small[i + 1] / 255 - MEAN[1]) / STD[1];
      data[2 * n + p] = (small[i + 2] / 255 - MEAN[2]) / STD[2];
    }

    // 3. 推理
    const session = await loadSession(ort);
    const tensor = new ort.Tensor('float32', data, [1, 3, INPUT, INPUT]);
    const results = await session.run({ [session.inputNames[0]]: tensor });
    const logits = results[session.outputNames[0]].data as Float32Array;

    // 4. min-max 归一化 → mask
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (logits[i] < mn) mn = logits[i];
      if (logits[i] > mx) mx = logits[i];
    }
    const span = mx - mn || 1;
    const smallMask = new Float32Array(n);
    for (let i = 0; i < n; i++) smallMask[i] = (logits[i] - mn) / span;

    // 5. 放大 → 二值 alpha，无主体则放弃
    const mask = upscaleMask(smallMask, INPUT, w, h);
    const alpha = new Uint8Array(w * h);
    let sum = 0;
    for (let i = 0; i < alpha.length; i++) {
      alpha[i] = mask[i] > 0.5 ? 255 : 0;
      sum += alpha[i];
    }
    if (sum < w * h * 0.005 * 255) return null;

    // 6. 白描边（膨胀）
    const r = Math.max(3, Math.round(Math.min(w, h) / 110));
    const ring = dilate(alpha, w, h, r);

    // 7. 主体包围盒裁剪
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (ring[y * w + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const pad = r + 4;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
    const cw = maxX - minX + 1, ch = maxY - minY + 1;

    // 8. 合成：主体原色（软边）+ 白描边，其余透明
    const out = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const si = (minY + y) * w + (minX + x);
        const di = (y * cw + x) * 4;
        const soft = Math.max(0, Math.min(1, (mask[si] - 0.42) / 0.16));
        if (ring[si] !== 0) { // dilate 输出是 0/255，不能与 1 比较
          if (soft > 0.02) {
            const so = si * 4;
            out[di] = rgba[so]; out[di + 1] = rgba[so + 1]; out[di + 2] = rgba[so + 2];
            out[di + 3] = Math.round(soft * 255);
          } else {
            out[di] = 255; out[di + 1] = 255; out[di + 2] = 255; out[di + 3] = 255;
          }
        }
      }
    }

    // 9. 输出 PNG data URI
    const outCanvas = document.createElement('canvas');
    outCanvas.width = cw; outCanvas.height = ch;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;
    outCtx.putImageData(new ImageData(out, cw, ch), 0, 0);
    return { uri: outCanvas.toDataURL('image/png'), width: cw, height: ch };
  } catch {
    return null;
  }
}
