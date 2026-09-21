// 合成提示音资源：node scripts/gen-sounds.js（无需外部依赖，输出 16bit PCM 单声道 wav）
const fs = require('fs');
const path = require('path');

const SR = 44100;

function writeWav(file, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
  console.log('wrote', file, `${(samples.length / SR * 1000).toFixed(0)}ms`);
}

// 「叮」：A5→D6 滑音 + 倍频泛音，指数衰减，约 0.6s
function ding() {
  const dur = 0.6;
  const n = Math.round(SR * dur);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = t / dur;
    const f = 880 + (1174 - 880) * k;
    const env = Math.exp(-5 * t);
    out[i] = env * (0.7 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * t));
  }
  return out;
}

// 「嗒」：1.8kHz 短促，60ms 快衰减
function tick() {
  const dur = 0.06;
  const n = Math.round(SR * dur);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.exp(-55 * t) * (0.8 * Math.sin(2 * Math.PI * 1800 * t) + 0.2 * Math.sin(2 * Math.PI * 3600 * t));
  }
  return out;
}

const dir = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(dir, { recursive: true });
writeWav(path.join(dir, 'ding.wav'), ding());
writeWav(path.join(dir, 'tick.wav'), tick());
