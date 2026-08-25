import { Pause, Play } from 'lucide-react';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  label?: string;
  className?: string;
}

/** 蓝图风音频播放器：播放/暂停 + 进度条点按定位 + 时间码 */
export function AudioPlayer({ src, label, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 音源变化时重置状态
  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [src]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      try {
        await el.play();
      } catch {
        // 播放被中断（如快速切换音源），忽略
      }
    }
  };

  const validDuration = Number.isFinite(duration) && duration > 0;
  const progress = validDuration ? (time / duration) * 100 : 0;

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !validDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setTime(audio.currentTime);
  };

  return (
    <div className={cn('relative border border-border bg-background px-3 py-3', className)}>
      {label ? (
        <span className="absolute -top-2 left-2 bg-background px-1 text-[10px] tracking-widest text-muted-foreground">
          {label}
        </span>
      ) : null}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        您的浏览器不支持音频播放
      </audio>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 border-primary/40 text-primary hover:bg-primary/5 md:h-10 md:w-10"
          onClick={toggle}
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div
          className="flex h-8 min-w-0 flex-1 cursor-pointer items-center"
          onClick={handleSeek}
          role="slider"
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={validDuration ? Math.round(duration) : 0}
          aria-valuenow={Math.round(time)}
          tabIndex={0}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio || !validDuration) return;
            if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, time + 5);
            if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, time - 5);
          }}
        >
          <div className="relative h-1.5 w-full border border-primary/30 bg-secondary">
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 h-3 w-1 -translate-y-1/2 bg-accent"
              style={{ left: `calc(${progress}% - 2px)` }}
            />
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {formatDuration(time)} / {validDuration ? formatDuration(duration) : '--:--'}
        </span>
      </div>
    </div>
  );
}
