import { FileAudio, FileImage, Upload, X } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FileDropProps {
  /** 区域标注，如 "FIG 1.1" */
  spec?: string;
  /** 拖放区提示标题 */
  title: string;
  /** 支持的格式说明 */
  hint: string;
  accept: Record<string, string[]>;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  /** 文件类型图标 */
  kind?: 'audio' | 'image';
}

/** 蓝图风文件拖放区：虚线边框 + 技术标注 + 已选文件条 */
export function FileDrop({ spec, title, hint, accept, file, onFile, onClear, disabled, kind = 'audio' }: FileDropProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    disabled,
    noClick: !!file,
  });

  const Icon = kind === 'image' ? FileImage : FileAudio;

  if (file) {
    return (
      <div className="relative border border-primary/60 bg-primary/5 px-4 py-3">
        {spec ? <span className="absolute -top-2 left-2 bg-card px-1 text-[10px] tracking-widest text-primary/70">{spec}</span> : null}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/40 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold" title={file.name}>
              {file.name}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onClear}
            aria-label="移除文件"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps({
        className: cn(
          'relative cursor-pointer border-2 border-dashed border-input bg-background px-4 py-8 text-center transition-colors',
          'hover:border-primary/60 hover:bg-primary/5',
          isDragActive && !isDragReject && 'border-primary bg-primary/10',
          isDragReject && 'border-destructive bg-destructive/10',
          disabled && 'cursor-not-allowed opacity-50'
        ),
      })}
    >
      <input {...getInputProps()} />
      {spec ? <span className="absolute -top-2 left-2 bg-background px-1 text-[10px] tracking-widest text-muted-foreground">{spec}</span> : null}
      <Upload className="mx-auto h-6 w-6 text-primary" />
      <p className="mt-2 text-sm font-bold">{isDragActive ? '释放以载入文件' : title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
