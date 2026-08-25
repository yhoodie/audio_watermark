/** 音频解码与 WAV(PCM) 编码工具 */

/** 解码音频文件为 AudioBuffer（支持浏览器可解码的全部格式） */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const Ctor: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    void ctx.close();
  }
}

/** 克隆 AudioBuffer（避免嵌入过程污染原始数据） */
export function cloneAudioBuffer(buffer: AudioBuffer): AudioBuffer {
  const copy = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    copy.copyToChannel(buffer.getChannelData(c), c);
  }
  return copy;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * 将 AudioBuffer 编码为 16-bit PCM WAV Blob
 * 量化采用 /32768 缩放，与嵌入/提取的 floatToInt16 完全互逆，保证低 2 位无损往返
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const len = buffer.length;
  const dataSize = len * numCh * 2;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      const s = Math.max(-32768, Math.min(32767, Math.round(v * 32768)));
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

/** 将 8kHz 8-bit 无符号单声道 PCM 载荷封装为 WAV Blob */
export function pcm8ToWavBlob(payload: Uint8Array, sampleRate: number): Blob {
  const dataSize = payload.length;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byteRate = rate * 1 * 1
  view.setUint16(32, 1, true); // blockAlign
  view.setUint16(34, 8, true); // 8-bit
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < payload.length; i++) {
    view.setUint8(44 + i, payload[i]);
  }
  return new Blob([out], { type: 'audio/wav' });
}
