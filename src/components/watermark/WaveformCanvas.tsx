import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WaveformCanvasProps {
  buffer: AudioBuffer;
  height?: number;
  className?: string;
  label?: string;
}

function readToken(name: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? `hsl(${raw})` : fallback;
}

/** 蓝图风波形图：min/max 柱状包络 + 中心基准线 */
export function WaveformCanvas({ buffer, height = 96, className, label }: WaveformCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, container.clientWidth);
      canvas.width = w * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const wave = readToken('--primary', '#0D47A1');
      const base = readToken('--border', '#C7D5E8');
      const mid = height / 2;

      // 中心基准线 + 1/4 刻度线
      ctx.strokeStyle = base;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, mid + 0.5);
      ctx.lineTo(w, mid + 0.5);
      ctx.moveTo(0, mid / 2 + 0.5);
      ctx.lineTo(w, mid / 2 + 0.5);
      ctx.moveTo(0, mid * 1.5 + 0.5);
      ctx.lineTo(w, mid * 1.5 + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      const data = buffer.getChannelData(0);
      const step = Math.max(1, Math.floor(data.length / w));
      const subStep = Math.max(1, Math.floor(step / 40));
      ctx.fillStyle = wave;
      for (let x = 0; x < w; x++) {
        const start = x * step;
        let min = 0;
        let max = 0;
        for (let j = 0; j < step; j += subStep) {
          const v = data[start + j] ?? 0;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const y1 = mid - max * (mid - 2);
        const y2 = mid - min * (mid - 2);
        ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [buffer, height]);

  return (
    <div ref={containerRef} className={cn('relative border border-dashed border-border bg-background', className)}>
      {label ? (
        <span className="absolute -top-2 left-2 bg-background px-1 text-[10px] tracking-widest text-muted-foreground">
          {label}
        </span>
      ) : null}
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
