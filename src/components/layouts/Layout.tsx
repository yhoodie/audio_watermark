import { AudioWaveform, FileInput, FileOutput } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Crosshair } from './Crosshair';

const NAV_ITEMS = [
  { to: '/embed', label: '水印嵌入', code: 'OP-01', icon: FileInput },
  { to: '/extract', label: '水印提取', code: 'OP-02', icon: FileOutput },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col blueprint-grid">
      <Crosshair />

      {/* 页缘顶部尺寸刻度 */}
      <div aria-hidden className="blueprint-ruler-x h-1.5 w-full" />

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 md:px-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <AudioWaveform className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-bold">音频数字水印工具</p>
            <p className="truncate text-[10px] tracking-widest text-muted-foreground">
              AUDIO WATERMARK · LSB-2 · PCM/WAV
            </p>
          </div>
          <nav className="flex shrink-0 items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center gap-2 border px-3 text-xs font-bold transition-colors',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-transparent text-foreground hover:border-border hover:bg-secondary'
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.code}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 md:px-6">
          <span className="text-[10px] tracking-widest text-muted-foreground">DWG NO. WMK-2026-001</span>
          <span className="text-[10px] tracking-widest text-muted-foreground">SCALE 1:1</span>
          <span className="text-[10px] tracking-widest text-muted-foreground">SHEET 1/1</span>
          <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">
            所有处理均在本地浏览器完成 · 文件不会上传
          </span>
        </div>
      </footer>
    </div>
  );
}
