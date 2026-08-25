import { AlertTriangle, Download, Image as ImageIcon, Loader2, Music, ShieldCheck, Type } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AudioPlayer } from '@/components/watermark/AudioPlayer';
import { BlueprintSection, SpecTag } from '@/components/watermark/BlueprintSection';
import { FileDrop } from '@/components/watermark/FileDrop';
import { WaveformCanvas } from '@/components/watermark/WaveformCanvas';
import { formatBytes, formatDuration, formatSampleRate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { audioBufferToWavBlob, cloneAudioBuffer, decodeAudioFile } from '@/lib/watermark/audio-io';
import { embedPacket, maxPayloadBytes } from '@/lib/watermark/embed';
import {
  IMAGE_PAYLOAD_BYTES,
  WM_AUDIO_RATE,
  audioFileToPayload,
  imageFileToPayload,
  payloadToImageDataUrl,
  textToPayload,
} from '@/lib/watermark/payload';
import { packPacket, type WatermarkType } from '@/lib/watermark/protocol';

interface CarrierState {
  file: File;
  buffer: AudioBuffer;
  url: string;
}

interface EmbedResult {
  url: string;
  name: string;
  size: number;
  duration: number;
  buffer: AudioBuffer;
}

const WM_TYPE_OPTIONS: Array<{
  value: WatermarkType;
  label: string;
  spec: string;
  icon: typeof Type;
}> = [
  { value: 'text', label: '文字', spec: 'UTF-8 字节流', icon: Type },
  { value: 'image', label: '图像', spec: '48×48 灰度', icon: ImageIcon },
  { value: 'audio', label: '音频', spec: '8kHz 8-bit 单声道', icon: Music },
];

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

export default function EmbedPage() {
  const [carrier, setCarrier] = useState<CarrierState | null>(null);
  const [decodingCarrier, setDecodingCarrier] = useState(false);
  const [wmType, setWmType] = useState<WatermarkType>('text');
  const [textValue, setTextValue] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePayload, setImagePayload] = useState<Uint8Array | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [wmAudioFile, setWmAudioFile] = useState<File | null>(null);
  const [wmAudioUrl, setWmAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<EmbedResult | null>(null);

  const capacity = carrier ? maxPayloadBytes(carrier.buffer) : 0;
  const textBytes = useMemo(() => textToPayload(textValue).length, [textValue]);

  // 释放输出文件的 ObjectURL
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  // 释放载体预览的 ObjectURL
  useEffect(() => {
    return () => {
      if (carrier) URL.revokeObjectURL(carrier.url);
    };
  }, [carrier]);

  // 释放水印音频试听的 ObjectURL
  useEffect(() => {
    return () => {
      if (wmAudioUrl) URL.revokeObjectURL(wmAudioUrl);
    };
  }, [wmAudioUrl]);

  const handleWmAudioFile = (file: File) => {
    setWmAudioFile(file);
    setWmAudioUrl(URL.createObjectURL(file));
  };

  const clearWmAudio = () => {
    setWmAudioFile(null);
    setWmAudioUrl(null);
  };

  const handleCarrierFile = async (file: File) => {
    setDecodingCarrier(true);
    setResult(null);
    try {
      const buffer = await decodeAudioFile(file);
      setCarrier({ file, buffer, url: URL.createObjectURL(file) });
    } catch {
      toast.error('无法解码该文件，请上传有效的音频文件');
      setCarrier(null);
    } finally {
      setDecodingCarrier(false);
    }
  };

  const handleImageFile = async (file: File) => {
    try {
      const payload = await imageFileToPayload(file);
      setImageFile(file);
      setImagePayload(payload);
      setImagePreview(payloadToImageDataUrl(payload));
    } catch {
      toast.error('无法读取该图像文件，请更换图片');
      setImageFile(null);
      setImagePayload(null);
      setImagePreview(null);
    }
  };

  const canEmbed =
    !!carrier &&
    !decodingCarrier &&
    !busy &&
    (wmType === 'text' ? textValue.trim().length > 0 : wmType === 'image' ? !!imagePayload : !!wmAudioFile);

  const handleEmbed = async () => {
    if (!carrier) return;
    try {
      setBusy('正在生成水印数据…');
      await yieldToUi();

      let payload: Uint8Array;
      let truncated = false;
      if (wmType === 'text') {
        payload = textToPayload(textValue.trim());
      } else if (wmType === 'image') {
        if (!imagePayload) throw new Error('NO_IMAGE_PAYLOAD');
        payload = imagePayload;
      } else {
        if (!wmAudioFile) throw new Error('NO_AUDIO_FILE');
        const res = await audioFileToPayload(wmAudioFile, capacity);
        payload = res.payload;
        truncated = res.truncated;
      }

      if (payload.length === 0) {
        toast.error('水印内容为空，无法嵌入');
        return;
      }
      if (payload.length > capacity) {
        toast.error(
          `载体容量不足：当前载体可嵌入约 ${formatBytes(capacity)}，该水印需要 ${formatBytes(payload.length)}。请更换更长的载体音频或缩小水印。`
        );
        return;
      }

      setBusy('正在嵌入水印…');
      await yieldToUi();
      const watermarked = cloneAudioBuffer(carrier.buffer);
      embedPacket(watermarked, packPacket(wmType, payload));

      setBusy('正在生成音频文件…');
      await yieldToUi();
      const blob = audioBufferToWavBlob(watermarked);
      const url = URL.createObjectURL(blob);
      const baseName = carrier.file.name.replace(/\.[^.]+$/, '');
      setResult({
        url,
        name: `${baseName}_watermarked.wav`,
        size: blob.size,
        duration: watermarked.duration,
        buffer: watermarked,
      });
      if (truncated) toast.warning('水印音频过长，已按载体容量自动截断');
      toast.success('水印嵌入完成');
    } catch {
      toast.error('处理失败，请检查文件后重试');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-foreground pb-3">
        <div>
          <SpecTag>OPERATION 01 / EMBED</SpecTag>
          <h1 className="mt-1 text-xl font-bold text-balance md:text-2xl">水印嵌入</h1>
        </div>
        <SpecTag>ALGORITHM: LSB-2 · CH-1</SpecTag>
      </div>

      {/* FIG 01 载体 */}
      <BlueprintSection
        fig="01"
        title="载体音频"
        desc="作为水印载体的音频文件。支持常见音频格式，输出统一为无损 WAV。"
      >
        <div className="space-y-4">
          <FileDrop
            spec="FIG 1.1"
            title="拖入或点击选择载体音频"
            hint="WAV / MP3 / M4A / OGG / FLAC 等浏览器可解码格式"
            accept={{ 'audio/*': [] }}
            file={carrier?.file ?? null}
            onFile={handleCarrierFile}
            onClear={() => {
              setCarrier(null);
              setResult(null);
            }}
            disabled={!!busy}
          />
          {decodingCarrier ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在解码载体…
            </p>
          ) : null}
          {carrier ? (
            <>
              <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
                {[
                  { label: '时长 DURATION', value: formatDuration(carrier.buffer.duration) },
                  { label: '采样率 RATE', value: formatSampleRate(carrier.buffer.sampleRate) },
                  { label: '声道 CHANNELS', value: `${carrier.buffer.numberOfChannels} CH` },
                  { label: '可嵌入容量 CAPACITY', value: formatBytes(capacity) },
                ].map((item) => (
                  <div key={item.label} className="bg-card px-3 py-2">
                    <p className="text-[10px] tracking-widest text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-sm font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              <WaveformCanvas buffer={carrier.buffer} label="FIG 1.2 载波波形 · CH-1" />
              <AudioPlayer src={carrier.url} label="FIG 1.3 载体试听" />
            </>
          ) : null}
        </div>
      </BlueprintSection>

      {/* FIG 02 水印 */}
      <BlueprintSection fig="02" title="水印数据" desc="选择水印类型并提供水印内容，水印将被编码后写入载体采样低位。">
        <div className="space-y-4">
          <RadioGroup
            value={wmType}
            onValueChange={(v) => setWmType(v as WatermarkType)}
            className="grid grid-cols-3 gap-2"
          >
            {WM_TYPE_OPTIONS.map((opt) => (
              <Label
                key={opt.value}
                className={cn(
                  'flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 border px-2 py-3 text-center transition-colors',
                  wmType === opt.value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={opt.value} className="sr-only" />
                <opt.icon className={cn('h-5 w-5', wmType === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-bold">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground">{opt.spec}</span>
              </Label>
            ))}
          </RadioGroup>

          {wmType === 'text' ? (
            <div className="relative">
              <Textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="输入要隐藏的文字，例如版权信息：© 2026 某某工作室 版权所有"
                className="min-h-28 px-2 pb-6 font-mono text-sm"
                disabled={!!busy}
              />
              <span className="pointer-events-none absolute right-2 bottom-2 text-[10px] text-muted-foreground">
                {formatBytes(textBytes)}
              </span>
            </div>
          ) : null}

          {wmType === 'image' ? (
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <FileDrop
                  spec="FIG 2.1"
                  kind="image"
                  title="拖入或点击选择水印图像"
                  hint="PNG / JPG / WEBP 等，将压缩为 48×48 灰度图"
                  accept={{ 'image/*': [] }}
                  file={imageFile}
                  onFile={handleImageFile}
                  onClear={() => {
                    setImageFile(null);
                    setImagePayload(null);
                    setImagePreview(null);
                  }}
                  disabled={!!busy}
                />
              </div>
              {imagePreview ? (
                <div className="shrink-0">
                  <SpecTag>嵌入预览 · 48×48 GRAY</SpecTag>
                  <div className="mt-1 border border-border bg-background p-2">
                    <img src={imagePreview} alt="水印图像灰度预览" className="h-24 w-24 [image-rendering:pixelated]" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {wmType === 'audio' ? (
            <div className="space-y-4">
              <FileDrop
                spec="FIG 2.2"
                title="拖入或点击选择水印音频"
                hint={`将重采样为 ${formatSampleRate(WM_AUDIO_RATE)} 8-bit 单声道；超出载体容量部分自动截断`}
                accept={{ 'audio/*': [] }}
                file={wmAudioFile}
                onFile={handleWmAudioFile}
                onClear={clearWmAudio}
                disabled={!!busy}
              />
              {wmAudioUrl ? <AudioPlayer src={wmAudioUrl} label="FIG 2.3 水印音频试听" /> : null}
            </div>
          ) : null}

          <p className="border-t border-dashed border-border pt-3 text-[11px] text-muted-foreground">
            当前载体可嵌入容量：{carrier ? formatBytes(capacity) : '—（请先上传载体音频）'}
            {wmType === 'text' && textBytes > 0 ? ` · 当前文字占用 ${formatBytes(textBytes)}` : ''}
            {wmType === 'image' ? ` · 图像固定占用 ${formatBytes(IMAGE_PAYLOAD_BYTES)}` : ''}
            {wmType === 'audio' ? ` · 音频每秒约占用 ${formatBytes(WM_AUDIO_RATE)}` : ''}
          </p>
        </div>
      </BlueprintSection>

      {/* FIG 03 输出 */}
      <BlueprintSection fig="03" title="嵌入输出">
        {!result ? (
          <div className="space-y-4">
            {!canEmbed && !busy ? (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {!carrier
                  ? '请先在 FIG 01 上传载体音频，并在 FIG 02 提供水印内容。'
                  : '请在 FIG 02 提供水印内容。'}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={handleEmbed}
              disabled={!canEmbed}
              className="h-11 bg-accent px-6 text-sm font-bold text-accent-foreground hover:bg-accent/90"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {busy}
                </>
              ) : (
                '开始嵌入'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              嵌入完成，输出文件已生成
            </div>
            <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3">
              {[
                { label: '文件名 FILE', value: result.name },
                { label: '大小 SIZE', value: formatBytes(result.size) },
                { label: '时长 DURATION', value: formatDuration(result.duration) },
              ].map((item) => (
                <div key={item.label} className="min-w-0 bg-card px-3 py-2">
                  <p className="text-[10px] tracking-widest text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 truncate text-sm font-bold" title={item.value}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <WaveformCanvas buffer={result.buffer} label="FIG 3.1 嵌入后波形 · CH-1" />
            <AudioPlayer src={result.url} label="FIG 3.2 输出试听 · 可与 FIG 1.3 载体对比" />
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button asChild className="h-11 bg-accent px-6 text-sm font-bold text-accent-foreground hover:bg-accent/90">
                <a href={result.url} download={result.name}>
                  <Download className="h-4 w-4" /> 下载嵌入水印的音频
                </a>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11"
                onClick={() => {
                  setResult(null);
                }}
              >
                重新嵌入
              </Button>
            </div>
            <p className="border-t border-dashed border-border pt-3 text-[11px] text-pretty text-muted-foreground">
              输出为无损 PCM/WAV 格式以保持水印完整。请注意：转换为 MP3 / AAC 等有损格式会破坏水印数据，导致无法提取。
            </p>
          </div>
        )}
      </BlueprintSection>
    </div>
  );
}
