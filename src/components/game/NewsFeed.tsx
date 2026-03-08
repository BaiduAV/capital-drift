import { useGame } from '@/context/GameContext';
import type { EventCard, EventType } from '@/engine/types';

const eventMeta: Record<EventType, { icon: string; colorClass: string }> = {
  RATE_HIKE:              { icon: '📈', colorClass: 'text-terminal-red' },
  RATE_CUT:               { icon: '📉', colorClass: 'text-terminal-green' },
  INFLATION_UP:           { icon: '🔥', colorClass: 'text-terminal-red' },
  INFLATION_DOWN:         { icon: '❄️', colorClass: 'text-terminal-green' },
  SECTOR_BOOM:            { icon: '🚀', colorClass: 'text-terminal-green' },
  SECTOR_BUST:            { icon: '📉', colorClass: 'text-terminal-red' },
  SECTOR_CRASH:           { icon: '💥', colorClass: 'text-terminal-red' },
  CRYPTO_HACK:            { icon: '🔓', colorClass: 'text-terminal-red' },
  CRYPTO_EUPHORIA_EVENT:  { icon: '🎉', colorClass: 'text-terminal-amber' },
  CRYPTO_RUG_PULL:        { icon: '💀', colorClass: 'text-terminal-red' },
  CREDIT_DOWNGRADE:       { icon: '⚠️', colorClass: 'text-terminal-amber' },
  FX_SHOCK:               { icon: '💵', colorClass: 'text-terminal-red' },
  FISCAL_STRESS:          { icon: '🏛️', colorClass: 'text-terminal-red' },
  COMMODITY_BOOM:         { icon: '🛢️', colorClass: 'text-terminal-green' },
  IPO_ANNOUNCED:          { icon: '📋', colorClass: 'text-terminal-amber' },
  IPO_BOOKBUILDING:       { icon: '📊', colorClass: 'text-terminal-amber' },
  IPO_LISTED:             { icon: '🏦', colorClass: 'text-terminal-green' },
};

interface NewsItem {
  dayIndex: number;
  event: EventCard;
}

export default function NewsFeed() {
  const { dayResults, t, locale } = useGame();

  const items: NewsItem[] = [];
  for (let i = dayResults.length - 1; i >= 0 && items.length < 12; i--) {
    const dr = dayResults[i];
    for (const ev of dr.events) {
      if (items.length >= 12) break;
      items.push({ dayIndex: dr.dayIndex, event: ev });
    }
  }

  if (items.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-muted-foreground font-mono">
          {locale === 'pt-BR' ? 'Avance dias para ver notícias do mercado.' : 'Advance days to see market news.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-terminal px-3 py-2">
        {items.map((item, i) => {
          const meta = eventMeta[item.event.type] ?? { icon: '📌', colorClass: 'text-foreground' };
          return (
            <div
              key={`${item.dayIndex}-${item.event.type}-${i}`}
              className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0 animate-news-slide-in group hover:bg-secondary/30 rounded px-1 transition-colors duration-200"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-sm shrink-0 group-hover:scale-110 transition-transform duration-200">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                {(() => {
                  // Translate sector in vars if present
                  const vars = item.event.vars
                    ? { ...item.event.vars, sector: item.event.vars.sector ? t(`sector.${item.event.vars.sector}`) : '' }
                    : undefined;
                  return (
                    <>
                      <div className={`text-xs font-mono font-semibold ${meta.colorClass} truncate`}>
                        {t(item.event.titleKey, vars)}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {t(item.event.descriptionKey, vars)}
                      </div>
                    </>
                  );
                })()}
                <div className="text-[9px] text-muted-foreground/50 mt-0.5 font-mono">
                  D{item.dayIndex}
                </div>
              </div>
              {/* Impact bar */}
              <div className="shrink-0 w-1 h-6 rounded-full mt-0.5 overflow-hidden bg-secondary">
                <div
                  className={`w-full rounded-full transition-all duration-500 ${
                    meta.colorClass.includes('red') ? 'bg-terminal-red' :
                    meta.colorClass.includes('green') ? 'bg-terminal-green' : 'bg-terminal-amber'
                  }`}
                  style={{ height: `${Math.min(100, item.event.magnitude * 500)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
  );
}
