import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EventCard, EventType } from '@/engine/types';

const eventMeta: Record<EventType, { icon: string; colorClass: string }> = {
  RATE_HIKE:              { icon: '📈', colorClass: 'text-[hsl(var(--terminal-red))]' },
  RATE_CUT:               { icon: '📉', colorClass: 'text-[hsl(var(--terminal-green))]' },
  INFLATION_UP:           { icon: '🔥', colorClass: 'text-[hsl(var(--terminal-red))]' },
  INFLATION_DOWN:         { icon: '❄️', colorClass: 'text-[hsl(var(--terminal-green))]' },
  SECTOR_BOOM:            { icon: '🚀', colorClass: 'text-[hsl(var(--terminal-green))]' },
  SECTOR_BUST:            { icon: '📉', colorClass: 'text-[hsl(var(--terminal-red))]' },
  CRYPTO_HACK:            { icon: '🔓', colorClass: 'text-[hsl(var(--terminal-red))]' },
  CRYPTO_EUPHORIA_EVENT:  { icon: '🎉', colorClass: 'text-[hsl(var(--terminal-amber))]' },
  CRYPTO_RUG_PULL:        { icon: '💀', colorClass: 'text-[hsl(var(--terminal-red))]' },
  CREDIT_DOWNGRADE:       { icon: '⚠️', colorClass: 'text-[hsl(var(--terminal-amber))]' },
};

interface NewsItem {
  dayIndex: number;
  event: EventCard;
}

export default function NewsFeed() {
  const { dayResults, t, locale } = useGame();

  // Collect all events from recent days, newest first
  const items: NewsItem[] = [];
  for (let i = dayResults.length - 1; i >= 0 && items.length < 8; i--) {
    const dr = dayResults[i];
    for (const ev of dr.events) {
      if (items.length >= 8) break;
      items.push({ dayIndex: dr.dayIndex, event: ev });
    }
  }

  if (items.length === 0) {
    return (
      <Card className="terminal-card h-full">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-sans text-muted-foreground">
            {locale === 'pt-BR' ? 'Notícias' : 'News'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs text-muted-foreground font-mono">
            {locale === 'pt-BR' ? 'Nenhum evento recente.' : 'No recent events.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="terminal-card h-full">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-sans text-muted-foreground">
          {locale === 'pt-BR' ? 'Notícias' : 'News'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-terminal">
        {items.map((item, i) => {
          const meta = eventMeta[item.event.type] ?? { icon: '📌', colorClass: 'text-foreground' };
          return (
            <div
              key={`${item.dayIndex}-${i}`}
              className="flex items-start gap-2 py-1 border-b border-border/50 last:border-0 animate-fade-in"
            >
              <span className="text-sm shrink-0">{meta.icon}</span>
              <div className="min-w-0">
                <div className={`text-xs font-mono font-semibold ${meta.colorClass} truncate`}>
                  {t(item.event.titleKey)}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {t(item.event.descriptionKey)}
                </div>
                <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                  D{item.dayIndex}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
