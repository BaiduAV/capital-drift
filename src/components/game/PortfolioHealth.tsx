import { useMemo, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { computeHealthScore, type HealthScoreResult } from '@/engine/healthScore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const COMPONENT_META = {
  cash: { pt: 'Reserva de Caixa', en: 'Cash Reserve', tipPt: 'Ideal: 10–30% do patrimônio em caixa', tipEn: 'Ideal: 10–30% of equity in cash' },
  assetDiv: { pt: 'Div. por Ativo', en: 'Asset Diversity', tipPt: 'Concentração entre ativos individuais (HHI)', tipEn: 'Concentration across individual assets (HHI)' },
  classDiv: { pt: 'Div. por Classe', en: 'Class Diversity', tipPt: 'Exposição a RF, Ações, FIIs, Crypto', tipEn: 'Exposure to Fixed Income, Stocks, REITs, Crypto' },
  drawdown: { pt: 'Drawdown 30d', en: 'Drawdown 30d', tipPt: 'Queda máxima nos últimos 30 dias', tipEn: 'Max decline over last 30 days' },
  performance: { pt: 'Perf. vs CDI', en: 'Perf. vs CDI', tipPt: 'Retorno acumulado comparado ao CDI', tipEn: 'Cumulative return compared to CDI' },
} as const;

type ComponentKey = keyof typeof COMPONENT_META;
const KEYS: ComponentKey[] = ['cash', 'assetDiv', 'classDiv', 'drawdown', 'performance'];

function MiniBar({ value, max, label, tooltip, locale }: { value: number; max: number; label: string; tooltip: string; locale: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = pct >= 70 ? 'bg-[hsl(var(--terminal-green))]' : pct >= 40 ? 'bg-[hsl(var(--terminal-amber))]' : 'bg-[hsl(var(--terminal-red))]';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground w-[72px] sm:w-[88px] truncate text-right">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-foreground w-6 text-right">{value}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PortfolioHealth() {
  const { state, equity, locale } = useGame();
  const [open, setOpen] = useState(false);

  const result: HealthScoreResult = useMemo(
    () => computeHealthScore(state, equity),
    [state.cash, state.portfolio, state.assets, state.assetCatalog, state.history.equity, state.history.cdiAccumulated, equity],
  );

  const { total, breakdown, tips } = result;

  const label = total >= 70
    ? { text: locale === 'pt-BR' ? 'Saudável' : 'Healthy', emoji: '🟢' }
    : total >= 40
    ? { text: locale === 'pt-BR' ? 'Moderado' : 'Moderate', emoji: '🟡' }
    : { text: locale === 'pt-BR' ? 'Arriscado' : 'Risky', emoji: '🔴' };

  const barColor = total >= 70
    ? 'hsl(var(--terminal-green))'
    : total >= 40
    ? 'hsl(var(--terminal-amber))'
    : 'hsl(var(--terminal-red))';

  return (
    <Card className="terminal-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="py-2 px-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full group cursor-pointer">
            <CardTitle className="text-xs font-sans text-muted-foreground">
              {locale === 'pt-BR' ? 'Saúde do Portfólio' : 'Portfolio Health'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono">{label.emoji} {total}</span>
              <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CardContent className="px-3 pb-3 space-y-2">
          {/* Main bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${total}%`, backgroundColor: barColor }}
            />
          </div>

          <CollapsibleContent className="space-y-3 pt-1">
            {/* Breakdown mini-bars */}
            <div className="space-y-1.5">
              {KEYS.map((key) => {
                const meta = COMPONENT_META[key];
                return (
                  <MiniBar
                    key={key}
                    value={breakdown[key]}
                    max={20}
                    label={locale === 'pt-BR' ? meta.pt : meta.en}
                    tooltip={locale === 'pt-BR' ? meta.tipPt : meta.tipEn}
                    locale={locale}
                  />
                );
              })}
            </div>

            {/* Tips */}
            {tips.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-border/50">
                {tips.map((tip) => (
                  <div key={tip.key} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-[hsl(var(--terminal-amber))]" />
                    <span>{locale === 'pt-BR' ? tip.pt : tip.en}</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
