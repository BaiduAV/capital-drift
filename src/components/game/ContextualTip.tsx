import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'capital-drift-tips-seen';

function getSeenTips(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function markSeen(id: string) {
  const seen = getSeenTips();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }
}

interface ContextualTipProps {
  id: string;
  message: string;
  className?: string;
}

export default function ContextualTip({ id, message, className }: ContextualTipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = getSeenTips();
    if (!seen.includes(id)) setVisible(true);
  }, [id]);

  if (!visible) return null;

  const dismiss = () => {
    markSeen(id);
    setVisible(false);
  };

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20 text-xs font-mono text-primary animate-fade-in',
      className
    )}>
      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={dismiss} className="shrink-0 hover:text-foreground transition-colors" aria-label="Dismiss tip">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
