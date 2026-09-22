/**
 * 端上主体抠图（描边贴纸）
 * u2netp 分割模型（4.7MB，Apache-2.0）通过 onnxruntime 在手机本地推理：
 * 照片 → 主体遮罩 → 描边贴纸合成（src/lib/sticker.ts）→ 透明 PNG。
 * 仅原生端可用；Web 端见 cutout.web.ts。
 */
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as ort from 'onnxruntime-react-native';
import jpeg from 'jpeg-js';
import { deflate } from 'pako';
import { renderSticker, STICKER_INPUT, STICKER_MAX_SIDE, upscaleMask } from './sticker';
import type { CutoutResult } from './cutout.types';

export type { CutoutResult };

const INPUT = STICKER_INPUT;
const MAX_SIDE = STICKER_MAX_SIDE;

let sessionP: Promise<ort.InferenceSession> | null = null;

function loadSession(): Promise<ort.InferenceSession> {
  if (!sessionP) {
    sessionP = (async () => {
      // @ts-ignore .onnx 资源由 metro.config 注册
      const asset = Asset.fromModule(require('../../assets/models/u2netp.onnx'));
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      return ort.InferenceSession.create(uri, { executionMode: 'sequential' });
    })().catch((e) => {
      sessionP = null;
      throw e;
    });
  }
  return sessionP;
}

/* ---------- base64 / PNG 基础工具（Hermes 无 btoa/atob） ---------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(b64: string): Uint8Array {
  const s = b64.slice(b64.indexOf(',') + 1).replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((s.length * 3) / 4);
  const out = new Uint8Array(len);
  let o = 0;
  for (let i = 0; i + 3 < s.length + 1; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12)
      | ((B64.indexOf(s[i + 2]) & 63) << 6) | (B64.indexOf(s[i + 3]) & 63);
    if (o < len) out[o++] = (n >> 16) & 255;
    if (o < len) out[o++] = (n >> 8) & 255;
    if (o < len) out[o++] = n & 255;
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** RGBA → PNG（filter 0 + pako deflate，无 Buffer 依赖） */
function encodePNG(w: number, h: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = new Uint8Array(deflate(raw, { level: 6 }));
  const chunks = [sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', new Uint8Array(0))];
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/* ---------- 图像处理 ---------- */

/** 双线性缩放 RGBA */
function resizeRGBA(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const out = new Uint8Array(dw * dh * 4);
  const xr = sw / dw, yr = sh / dh;
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, (y + 0.5) * yr - 0.5);
    const y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(sh - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, (x + 0.5) * xr - 0.5);
      const x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(sw - 1, x0 + 1), wx = fx - x0;
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = src[i00 + c] * (1 - wx) + src[i10 + c] * wx;
        const bot = src[i01 + c] * (1 - wx) + src[i11 + c] * wx;
        out[o + c] = top * (1 - wy) + bot * wy;
      }
    }
  }
  return out;
}

/** RGBA → NCHW float32（ImageNet 归一化，u2net 标准） */
function toTensorData(img: Uint8Array, w: number, h: number): Float32Array {
  const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
  const n = w * h;
  const data = new Float32Array(3 * n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, p = y * w + x;
      data[p] = (img[i] / 255 - MEAN[0]) / STD[0];
      data[n + p] = (img[i + 1] / 255 - MEAN[1]) / STD[1];
      data[2 * n + p] = (img[i + 2] / 255 - MEAN[2]) / STD[2];
    }
  }
  return data;
}

/* ---------- 主流程 ---------- */

/**
 * 把照片抠成白描边贴纸。
 * @param src data URI（picker base64）或本地文件路径
 * @returns 贴纸文件 URI；失败或平台不支持时返回 null
 */
export async function cutoutSticker(src: string): Promise<CutoutResult | null> {
  if (Platform.OS === 'web') return null;
  try {
    // 1. 读入 JPEG 字节
    const jpegBytes = src.startsWith('data:')
      ? base64ToBytes(src)
      : base64ToBytes(await new File(src).base64());
    const img = jpeg.decode(jpegBytes, { useTArray: true, formatAsRGBA: true });

    // 2. 限制尺寸
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(8, Math.round(img.width * scale));
    const h = Math.max(8, Math.round(img.height * scale));
    const rgba = scale < 1 ? resizeRGBA(img.data, img.width, img.height, w, h) : img.data;

    // 3. 推理
    const session = await loadSession();
    const small = resizeRGBA(rgba, w, h, INPUT, INPUT);
    const tensor = new ort.Tensor('float32', toTensorData(small, INPUT, INPUT), [1, 3, INPUT, INPUT]);
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = tensor;
    const results = await session.run(feeds);
    const first = results[session.outputNames[0]];
    const logits = first.data as Float32Array;

    // 4. min-max 归一化 → 0..1 mask
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      const v = logits[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const span = mx - mn || 1;
    const smallMask = new Float32Array(INPUT * INPUT);
    for (let i = 0; i < smallMask.length; i++) smallMask[i] = (logits[i] - mn) / span;

    // 5. 放大到图像尺寸 → 描边贴纸（SDF 抗锯齿 + 柔影）
    const mask = upscaleMask(smallMask, INPUT, w, h);
    const sticker = renderSticker(rgba, w, h, mask);
    if (!sticker) return null;

    // 6. 编码 PNG 存文件
    const png = encodePNG(sticker.width, sticker.height, sticker.data);
    const dir = new Directory(Paths.document, 'stickers');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = new File(dir, `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`);
    file.write(png);
    return { uri: file.uri, width: sticker.width, height: sticker.height };
  } catch {
    return null;
  }
}
