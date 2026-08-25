/**
 * 水印数据包协议
 * 二进制结构（大端）：
 *   [0..3]  Magic "WMK1"
 *   [4]     水印类型（0=文字 1=图像 2=音频）
 *   [5..8]  payload 长度 uint32
 *   [9..]   payload 字节
 */

export const MAGIC = [0x57, 0x4d, 0x4b, 0x31] as const; // "WMK1"
export const HEADER_BYTES = 9;

export type WatermarkType = 'text' | 'image' | 'audio';

const TYPE_TO_CODE: Record<WatermarkType, number> = { text: 0, image: 1, audio: 2 };
const CODE_TO_TYPE: Record<number, WatermarkType> = { 0: 'text', 1: 'image', 2: 'audio' };

export const WATERMARK_TYPE_LABEL: Record<WatermarkType, string> = {
  text: '文字',
  image: '图像',
  audio: '音频',
};

/** 将水印类型与载荷打包为二进制数据包 */
export function packPacket(type: WatermarkType, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES + payload.length);
  out.set(MAGIC, 0);
  out[4] = TYPE_TO_CODE[type];
  new DataView(out.buffer).setUint32(5, payload.length, false);
  out.set(payload, HEADER_BYTES);
  return out;
}

export interface UnpackedPacket {
  type: WatermarkType;
  payload: Uint8Array;
}

/** 解析数据包；magic 不匹配或长度不足时返回 null */
export function unpackPacket(bytes: Uint8Array): UnpackedPacket | null {
  if (bytes.length < HEADER_BYTES) return null;
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) return null;
  }
  const type = CODE_TO_TYPE[bytes[4]];
  if (!type) return null;
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(5, false);
  if (length <= 0 || bytes.length < HEADER_BYTES + length) return null;
  return { type, payload: bytes.slice(HEADER_BYTES, HEADER_BYTES + length) };
}
