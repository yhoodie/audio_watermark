import { Check, Copy, Download, FileWarning, Image as ImageIcon, Loader2, Music, ScanSearch, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from '@/components/watermark/AudioPlayer';
import { BlueprintSection, SpecTag } from '@/components/watermark/BlueprintSection';
import { FileDrop } from '@/components/watermark/FileDrop';
import { WaveformCanvas } from '@/components/watermark/WaveformCanvas';
import { formatBytes, formatDuration } from '@/lib/format';
import { decodeAudioFile, pcm8ToWavBlob } from '@/lib/watermark/audio-io';
import { extractPacket } from '@/lib/watermark/embed';
import { WM_AUDIO_RATE, payloadToImageDataUrl, payloadToText } from '@/lib/watermark/payload';
import { WATERMARK_TYPE_LABEL } from '@/lib/watermark/protocol';

type ExtractResult =
  | { kind: 'text'; text: string; bytes: number }
  | { kind: 'image'; dataUrl: string; bytes: number }
  | { kind: 'audio'; url: string; name: string; bytes: number; durationSec: number };

const TYPE_ICON = { text: Type, image: ImageIcon, audio: Music } as const;

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

export default function ExtractPage() {
  const [target, setTarget] = useState<{ file: File; buffer: AudioBuffer; url: string } | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // 释放音频结果的 ObjectURL
  useEffect(() => {
    return () => {
      if (result?.kind === 'audio') URL.revokeObjectURL(result.url);
    };
  }, [result]);

  // 释放待检音频预览的 ObjectURL
  useEffect(() => {
    return () => {
      if (target) URL.revokeObjectURL(target.url);
    };
  }, [target]);

  const handleFile = async (file: File) => {
    setDecoding(true);
    setResult(null);
    setNotFound(false);
    try {
      const buffer = await decodeAudioFile(file);
      setTarget({ file, buffer, url: URL.createObjectURL(file) });
    } catch {
      toast.error('无法解码该文件，请上传有效的音频文件');
      setTarget(null);
    } finally {
      setDecoding(false);
    }
  };

  const handleExtract = async () => {
    if (!target) return;
    try {
      setBusy('正在扫描采样低位…');
      await yieldToUi();
      const packet = extractPacket(target.buffer);
      if (!packet) {
        setNotFound(true);
        setResult(null);
        return;
      }
      setBusy('正在重建水印内容…');
      await yieldToUi();
      setNotFound(false);
      if (packet.type === 'text') {
        setResult({ kind: 'text', text: payloadToText(packet.payload), bytes: packet.payload.length });
      } else if (packet.type === 'image') {
        setResult({
          kind: 'image',
          dataUrl: payloadToImageDataUrl(packet.payload),
          bytes: packet.payload.length,
        });
      } else {
        const blob = pcm8ToWavBlob(packet.payload, WM_AUDIO_RATE);
        setResult({
          kind: 'audio',
          url: URL.createObjectURL(blob),
          name: 'extracted_watermark.wav',
          bytes: packet.payload.length,
          durationSec: packet.payload.length / WM_AUDIO_RATE,
        });
      }
      toast.success(`提取成功：检测到${WATERMARK_TYPE_LABEL[packet.type]}水印`);
    } catch {
      toast.error('处理失败，请重试');
    } finally {
      setBusy(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败，请手动选择文本复制');
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-foreground pb-3">
        <div>
          <SpecTag>OPERATION 02 / EXTRACT</SpecTag>
          <h1 className="mt-1 text-xl font-bold text-balance md:text-2xl">水印提取</h1>
        </div>
        <SpecTag>HEADER: WMK1 · AUTO-DETECT</SpecTag>
      </div>

      {/* FIG 01 待检音频 */}
      <BlueprintSection
        fig="01"
        title="待检音频"
        desc="上传包含水印的音频文件。建议使用本工具生成的无损 WAV，MP3/AAC 等有损压缩会破坏水印。"
      >
        <div className="space-y-4">
          <FileDrop
            spec="FIG 1.1"
            title="拖入或点击选择待检音频"
            hint="本工具输出的 xxx_watermarked.wav 文件"
            accept={{ 'audio/*': [] }}
            file={target?.file ?? null}
            onFile={handleFile}
            onClear={() => {
              setTarget(null);
              setResult(null);
              setNotFound(false);
            }}
            disabled={!!busy}
          />
          {decoding ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在解码音频…
            </p>
          ) : null}
          {target ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3">
                {[
                  { label: '时长 DURATION', value: formatDuration(target.buffer.duration) },
                  { label: '采样率 RATE', value: `${(target.buffer.sampleRate / 1000).toFixed(1)} kHz` },
                  { label: '声道 CHANNELS', value: `${target.buffer.numberOfChannels} CH` },
                ].map((item) => (
                  <div key={item.label} className="bg-card px-3 py-2">
                    <p className="text-[10px] tracking-widest text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-sm font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              <WaveformCanvas buffer={target.buffer} label="FIG 1.2 待检波形 · CH-1" />
              <AudioPlayer src={target.url} label="FIG 1.3 待检音频试听" />
            </div>
          ) : null}
        </div>
      </BlueprintSection>

      {/* FIG 02 提取结果 */}
      <BlueprintSection fig="02" title="提取结果">
        <div className="space-y-4">
          <Button
            type="button"
            onClick={handleExtract}
            disabled={!target || !!busy || decoding}
            className="h-11 bg-accent px-6 text-sm font-bold text-accent-foreground hover:bg-accent/90"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {busy}
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" /> 开始提取
              </>
            )}
          </Button>
          {!target && !busy ? (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              请先在 FIG 01 上传待检音频文件。
            </p>
          ) : null}

          {notFound ? (
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>未检测到水印信息</AlertTitle>
              <AlertDescription className="text-xs">
                可能原因：该音频未嵌入水印；或文件经过 MP3 / AAC 等有损压缩、二次转码，导致水印数据丢失。
              </AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <div className="space-y-4 border-t border-dashed border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 border border-primary/40 text-primary">
                  {(() => {
                    const Icon = TYPE_ICON[result.kind];
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {WATERMARK_TYPE_LABEL[result.kind]}水印
                </Badge>
                <SpecTag>PAYLOAD {formatBytes(result.bytes)}</SpecTag>
              </div>

              {result.kind === 'text' ? (
                <div className="space-y-2">
                  <div className="relative border border-border bg-background p-4">
                    <SpecTag className="absolute -top-2 left-2 bg-background px-1">FIG 2.1 水印文本</SpecTag>
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{result.text}</p>
                  </div>
                  <Button type="button" variant="secondary" className="h-11" onClick={() => copyText(result.text)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? '已复制' : '复制文本'}
                  </Button>
                </div>
              ) : null}

              {result.kind === 'image' ? (
                <div className="space-y-2">
                  <div className="inline-block border border-border bg-background p-3">
                    <SpecTag>FIG 2.2 水印图像 · 48×48 GRAY</SpecTag>
                    <img
                      src={result.dataUrl}
                      alt="提取到的水印图像"
                      className="mt-2 h-40 w-40 border border-dashed border-border [image-rendering:pixelated]"
                    />
                  </div>
                  <div>
                    <Button asChild variant="secondary" className="h-11">
                      <a href={result.dataUrl} download="extracted_watermark.png">
                        <Download className="h-4 w-4" /> 下载图像 PNG
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}

              {result.kind === 'audio' ? (
                <div className="space-y-2">
                  <AudioPlayer src={result.url} label={`FIG 2.3 水印音频 · 8kHz 8-bit · ${formatDuration(result.durationSec)}`} />
                  <div>
                    <Button asChild variant="secondary" className="h-11">
                      <a href={result.url} download={result.name}>
                        <Download className="h-4 w-4" /> 下载音频 WAV
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </BlueprintSection>
    </div>
  );
}
