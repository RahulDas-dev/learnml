import type { ReactNode } from 'react';
import { AlertCircle, Download, LoaderCircle, WifiOff, RotateCcw } from 'lucide-react';
import type { AIStatus } from '@/agents';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface Props {
  status: AIStatus;
  downloadProgress?: number | null;
  message?: string;
  onRetry?: () => void;
}

export function AIStatusBanner({ status, downloadProgress, message, onRetry }: Props) {
  if (status === 'ready') return null;

  const configs: Record<Exclude<AIStatus, 'ready'>, {
    icon: ReactNode;
    text: string;
    cls: string;
    iconCls: string;
    textCls: string;
  }> = {
    checking: {
      icon: <LoaderCircle size={15} className="animate-spin" />,
      text: 'Checking Chrome AI availability…',
      cls: 'border-border bg-secondary',
      iconCls: 'text-muted-foreground',
      textCls: 'text-foreground/80',
    },
    downloading: {
      icon: <Download size={15} />,
      text: downloadProgress === null
        ? 'Loading model into memory…'
        : `Downloading Gemini Nano model… ${downloadProgress ?? 0}%`,
      cls: 'border-border bg-secondary',
      iconCls: 'text-muted-foreground',
      textCls: 'text-foreground/80',
    },
    unavailable: {
      icon: <WifiOff size={15} />,
      text: message || 'Gemini Nano unavailable on this device.',
      cls: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
      iconCls: 'text-red-500',
      textCls: 'text-red-600 dark:text-red-400',
    },
    unsupported: {
      icon: <AlertCircle size={15} />,
      text: message || 'Chrome Built-in AI not supported. Enable at chrome://flags/#prompt-api-for-gemini-nano',
      cls: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
      iconCls: 'text-red-500',
      textCls: 'text-red-600 dark:text-red-400',
    },
    error: {
      icon: <AlertCircle size={15} />,
      text: message || 'An error occurred initializing AI.',
      cls: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
      iconCls: 'text-red-500',
      textCls: 'text-red-600 dark:text-red-400',
    },
  };

  const cfg = configs[status as Exclude<AIStatus, 'ready'>];
  if (!cfg) return null;

  // Split on \n — first line is the header, rest become list items
  const lines = cfg.text.split('\n');
  const header = lines[0];
  const items = lines.slice(1).filter(Boolean);

  // Simple, single-line progress states read better centered.
  if (status === 'checking' || status === 'downloading') {
    return (
      <div className={`px-4 py-3 rounded-lg border ${cfg.cls} mb-4`}>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-2">
            <span className={`${cfg.iconCls} flex-shrink-0`}>{cfg.icon}</span>
            <p className={`text-sm ${cfg.textCls}`}>{header}</p>
          </div>
          {status === 'downloading' && (
            downloadProgress && downloadProgress > 0 ? (
              <Progress value={downloadProgress} className="h-1 w-full" />
            ) : (
              // Chrome often reports no measurable % for the large model download —
              // show an indeterminate animation instead of a frozen 0%.
              <div className="indeterminate-track h-1 w-full rounded bg-foreground/15">
                <div className="indeterminate-bar h-full w-1/3 rounded bg-foreground/60" />
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.cls} mb-4`}>
      <span className={`${cfg.iconCls} flex-shrink-0 mt-0.5`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${cfg.textCls}`}>{header}</p>
        {items.length > 0 && (
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {items.map((item, i) => (
              <li key={i} className={`text-xs leading-relaxed ${cfg.textCls}`}>{item}</li>
            ))}
          </ol>
        )}
        {status === 'downloading' && downloadProgress !== null && (
          <Progress value={downloadProgress ?? 0} className="mt-2 h-1" />
        )}
      </div>
      {onRetry && (status === 'unavailable' || status === 'error' || status === 'unsupported') && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRetry}
          className="flex-shrink-0 h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/30"
          title="Retry"
        >
          <RotateCcw size={14} className="text-red-500" />
        </Button>
      )}
    </div>
  );
}