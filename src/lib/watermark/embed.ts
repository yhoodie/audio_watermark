import { HEADER_BYTES, MAGIC, type UnpackedPacket, unpackPacket } from './protocol';

/**
 * LSB 水印嵌入/提取核心
 * 每个 16-bit 采样点的最低 2 位用于承载水印数据（高位先写）。
 * 仅写入第 1 声道，其余声道保持不变。
 */
export const BITS_PER_SAMPLE = 2;

/** float 采样 -> int16（与 WAV 编码 /32768 缩放互逆） */
function floatToInt16(v: number): number {
  const x = Math.round(Math.max(-1, Math.min(1, v)) * 32768);
  return Math.max(-32768, Math.min(32767, x));
}

/** 当前载体可嵌入的最大载荷字节数（已扣除包头） */
export function maxPayloadBytes(buffer: AudioBuffer): number {
  const samples = buffer.getChannelData(0).length;
  return Math.max(0, Math.floor((samples * BITS_PER_SAMPLE) / 8) - HEADER_BYTES);
}

/** 将数据包嵌入 AudioBuffer 第 1 声道（原地修改） */
export function embedPacket(buffer: AudioBuffer, packet: Uint8Array): void {
  const data = buffer.getChannelData(0);
  const totalBits = packet.length * 8;
  if (totalBits > data.length * BITS_PER_SAMPLE) {
    throw new Error('CAPACITY_EXCEEDED');
  }
  let bitIndex = 0;
  for (let i = 0; i < data.length && bitIndex < totalBits; i++) {
    const base = floatToInt16(data[i]) & ~0x3; // 清低 2 位
    let twoBits = 0;
    for (let b = BITS_PER_SAMPLE - 1; b >= 0; b--) {
      const byteIdx = bitIndex >> 3;
      const bitInByte = 7 - (bitIndex & 7);
      twoBits |= ((packet[byteIdx] >> bitInByte) & 1) << b;
      bitIndex++;
    }
    data[i] = (base | twoBits) / 32768;
  }
}

/** 从第 1 声道读取 nBytes 字节；采样不足时返回 null */
function readBytes(data: Float32Array, startSample: number, nBytes: number): Uint8Array | null {
  const needSamples = Math.ceil((nBytes * 8) / BITS_PER_SAMPLE);
  if (startSample + needSamples > data.length) return null;
  const out = new Uint8Array(nBytes);
  let bitIndex = 0;
  const totalBits = nBytes * 8;
  for (let i = startSample; bitIndex < totalBits; i++) {
    const twoBits = floatToInt16(data[i]) & 0x3;
    for (let b = BITS_PER_SAMPLE - 1; b >= 0; b--) {
      const bit = (twoBits >> b) & 1;
      out[bitIndex >> 3] |= bit << (7 - (bitIndex & 7));
      bitIndex++;
    }
  }
  return out;
}

/** 从音频中提取水印数据包；未检测到水印时返回 null */
export function extractPacket(buffer: AudioBuffer): UnpackedPacket | null {
  const data = buffer.getChannelData(0);
  const header = readBytes(data, 0, HEADER_BYTES);
  if (!header) return null;
  for (let i = 0; i < MAGIC.length; i++) {
    if (header[i] !== MAGIC[i]) return null;
  }
  const length = new DataView(header.buffer, header.byteOffset).getUint32(5, false);
  if (length <= 0) return null;
  const headerSamples = Math.ceil((HEADER_BYTES * 8) / BITS_PER_SAMPLE);
  const payload = readBytes(data, headerSamples, length);
  if (!payload) return null;
  const full = new Uint8Array(HEADER_BYTES + length);
  full.set(header, 0);
  full.set(payload, HEADER_BYTES);
  return unpackPacket(full);
}
