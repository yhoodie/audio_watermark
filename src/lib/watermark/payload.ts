import { decodeAudioFile } from './audio-io';

/** 水印载荷编解码：文字 / 图像(48×48 灰度) / 音频(8kHz 8-bit 单声道) */

export const IMAGE_SIZE = 48;
export const IMAGE_PAYLOAD_BYTES = IMAGE_SIZE * IMAGE_SIZE;
export const WM_AUDIO_RATE = 8000;

/* ---------------- 文字 ---------------- */

export function textToPayload(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function payloadToText(payload: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(payload);
}

/* ---------------- 图像 ---------------- */

/** 图像文件 -> 48×48 灰度载荷（居中方形裁剪 + cover 缩放） */
export async function imageFileToPayload(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const img = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const out = new Uint8Array(IMAGE_PAYLOAD_BYTES);
    for (let i = 0; i < out.length; i++) {
      const r = img.data[i * 4];
      const g = img.data[i * 4 + 1];
      const b = img.data[i * 4 + 2];
      out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    return out;
  } finally {
    bitmap.close();
  }
}

/** 灰度载荷 -> PNG DataURL（用于预览与下载） */
export function payloadToImageDataUrl(payload: Uint8Array): string {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(IMAGE_SIZE, IMAGE_SIZE);
  for (let i = 0; i < IMAGE_PAYLOAD_BYTES; i++) {
    const g = payload[i] ?? 0;
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/* ---------------- 音频 ---------------- */

export interface AudioPayloadResult {
  payload: Uint8Array;
  durationSec: number;
  truncated: boolean;
}

/**
 * 音频文件 -> 8kHz 8-bit 单声道 PCM 载荷（线性插值重采样）
 * maxBytes 限制最长输出；超出部分截断
 */
export async function audioFileToPayload(file: File, maxBytes: number): Promise<AudioPayloadResult> {
  const buffer = await decodeAudioFile(file);
  const src = buffer.getChannelData(0);
  const srcRate = buffer.sampleRate;
  let targetLen = Math.floor(buffer.duration * WM_AUDIO_RATE);
  let truncated = false;
  if (targetLen > maxBytes) {
    targetLen = Math.max(0, maxBytes);
    truncated = true;
  }
  const out = new Uint8Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    const srcPos = (i / WM_AUDIO_RATE) * srcRate;
    const idx = Math.min(src.length - 1, Math.floor(srcPos));
    const frac = srcPos - idx;
    const next = src[Math.min(src.length - 1, idx + 1)];
    const v = src[idx] * (1 - frac) + next * frac;
    out[i] = Math.round((Math.max(-1, Math.min(1, v)) * 0.5 + 0.5) * 255);
  }
  return { payload: out, durationSec: targetLen / WM_AUDIO_RATE, truncated };
}
