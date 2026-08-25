import { useEffect, useRef } from 'react';

/**
 * 蓝图十字准星：跟随鼠标的虚线十字 + 坐标标注（仅桌面指针设备显示）
 */
export function Crosshair() {
  const hRef = useRef<HTMLDivElement>(null);
  const vRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (hRef.current) hRef.current.style.top = `${e.clientY}px`;
        if (vRef.current) vRef.current.style.left = `${e.clientX}px`;
        if (labelRef.current) {
          labelRef.current.style.left = `${e.clientX + 10}px`;
          labelRef.current.style.top = `${e.clientY + 10}px`;
          labelRef.current.textContent = `X:${e.clientX} Y:${e.clientY}`;
        }
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 hidden md:block">
      <div ref={hRef} className="absolute right-0 left-0 border-t border-dashed border-primary/25" />
      <div ref={vRef} className="absolute top-0 bottom-0 border-l border-dashed border-primary/25" />
      <div ref={labelRef} className="absolute text-[10px] text-primary/50 select-none" />
    </div>
  );
}
