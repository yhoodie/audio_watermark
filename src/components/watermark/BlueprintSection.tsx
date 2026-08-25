import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 等宽小字技术标注，如 "FIG 01" */
export function SpecTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10px] tracking-widest text-muted-foreground uppercase', className)}>
      {children}
    </span>
  );
}

/** 四角十字标记（CAD 块角标） */
function CornerCrosses() {
  const cross = 'pointer-events-none absolute h-2 w-2 text-primary/40 select-none';
  return (
    <>
      <span aria-hidden className={cn(cross, '-top-[5px] -left-[5px]')}>
        <svg viewBox="0 0 8 8" className="h-2 w-2">
          <path d="M4 0v8M0 4h8" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span aria-hidden className={cn(cross, '-top-[5px] -right-[5px]')}>
        <svg viewBox="0 0 8 8" className="h-2 w-2">
          <path d="M4 0v8M0 4h8" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span aria-hidden className={cn(cross, '-bottom-[5px] -left-[5px]')}>
        <svg viewBox="0 0 8 8" className="h-2 w-2">
          <path d="M4 0v8M0 4h8" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span aria-hidden className={cn(cross, '-right-[5px] -bottom-[5px]')}>
        <svg viewBox="0 0 8 8" className="h-2 w-2">
          <path d="M4 0v8M0 4h8" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
    </>
  );
}

interface BlueprintSectionProps {
  fig: string;
  title: string;
  desc?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 蓝图模块容器：FIG 编号 + 虚线分隔 + 角十字 */
export function BlueprintSection({ fig, title, desc, right, children, className }: BlueprintSectionProps) {
  return (
    <section className={cn('relative border border-border bg-card', className)}>
      <CornerCrosses />
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-dashed border-border px-4 py-3 md:px-6">
        <span className="shrink-0 text-[10px] font-bold tracking-widest text-accent">FIG {fig}</span>
        <h2 className="min-w-0 flex-1 text-base font-bold text-balance">{title}</h2>
        {right}
      </header>
      {desc ? (
        <p className="border-b border-dashed border-border px-4 py-2 text-xs text-pretty text-muted-foreground md:px-6">
          {desc}
        </p>
      ) : null}
      <div className="p-4 md:p-6">{children}</div>
    </section>
  );
}
