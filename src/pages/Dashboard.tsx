import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { computeEquity } from '@/engine/invariants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, FastForward, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { DayResult, PeriodResult } from '@/engine/types';

export default function Dashboard() {
  const { state, locale, equity, advanceDay, fastForward, dayResults, t } = useGame();
  const [lastDay, setLastDay] = useState<DayResult | null>(null);
  const [lastPeriod, setLastPeriod] = useState<PeriodResult | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const handleAdvance = () => {
    const r = advanceDay();
    setLastDay(r);
    setLastPeriod(null);
  };

  const handleFF = (days: number) => {
    const r = fastForward(days);
    setLastPeriod(r);
    setLastDay(null);
  };

  const peak = Math.max(...state.history.equity);
  const currentDD = peak > 0 ? (peak - equity) / peak : 0;
  const maxDD = Math.max(...state.history.drawdown);

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center gap-2">
        <Button onClick={handleAdvance} size="sm" className="gap-1.5 font-mono text-xs">
          <Play className="h-3.5 w-3.5" />
          {locale === 'pt-BR' ? 'Avançar Dia' : 'Next Day'}
        </Button>
        {[7, 30, 90].map(d => (
          <Button key={d} onClick={() => handleFF(d)} variant="secondary" size="sm" className="gap-1.5 font-mono text-xs">
            <FastForward className="h-3.5 w-3.5" />
            {d}d
          </Button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={locale === 'pt-BR' ? 'Patrimônio' : 'Equity'} value={formatCurrency(equity)} />
        <StatCard label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCurrency(state.cash)} />
        <StatCard label="Drawdown" value={formatPct(-currentDD)} negative={currentDD > 0} />
        <StatCard label={locale === 'pt-BR' ? 'DD Máximo' : 'Max DD'} value={formatPct(-maxDD)} negative={maxDD > 0} />
      </div>

      {/* Day Result */}
      {lastDay && (
        <Card className="terminal-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-sans">
              {locale === 'pt-BR' ? `Resultado Dia ${lastDay.dayIndex}` : `Day ${lastDay.dayIndex} Result`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2 text-xs font-mono">
            <div className="flex gap-4">
              <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Retorno' : 'Return'}:</span>
              <span className={lastDay.equityAfter >= lastDay.equityBefore ? 'price-up' : 'price-down'}>
                {formatPct((lastDay.equityAfter - lastDay.equityBefore) / lastDay.equityBefore)}
              </span>
            </div>
            {lastDay.events.length > 0 && (
              <div className="space-y-1">
                <span className="text-terminal-amber flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {locale === 'pt-BR' ? 'Eventos' : 'Events'}
                </span>
                {lastDay.events.map((e, i) => (
                  <div key={i} className="pl-4 text-muted-foreground">
                    <span className="text-foreground">{t(e.titleKey)}</span> — {t(e.descriptionKey)}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-6">
              <div>
                <TrendingUp className="h-3 w-3 inline mr-1 text-terminal-green" />
                {lastDay.marketSummary.topGainers.map(id => (
                  <span key={id} className="mr-2 text-terminal-green">{id}</span>
                ))}
              </div>
              <div>
                <TrendingDown className="h-3 w-3 inline mr-1 text-terminal-red" />
                {lastDay.marketSummary.topLosers.map(id => (
                  <span key={id} className="mr-2 text-terminal-red">{id}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Result */}
      {lastPeriod && (
        <Card className="terminal-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-sans">
              {locale === 'pt-BR'
                ? `Resumo: Dias ${lastPeriod.startDay}–${lastPeriod.endDay}`
                : `Summary: Days ${lastPeriod.startDay}–${lastPeriod.endDay}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2 text-xs font-mono">
            <div className="flex gap-6">
              <div>
                <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Retorno' : 'Return'}: </span>
                <span className={lastPeriod.totalReturn >= 0 ? 'price-up' : 'price-down'}>
                  {formatPct(lastPeriod.totalReturn)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Max DD: </span>
                <span className="price-down">{formatPct(-lastPeriod.maxDrawdown)}</span>
              </div>
            </div>
            {lastPeriod.topMovers.length > 0 && (
              <div>
                <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Maiores Movimentos' : 'Top Movers'}:</span>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {lastPeriod.topMovers.map(m => (
                    <span key={m.asset} className={m.return >= 0 ? 'price-up' : 'price-down'}>
                      {m.asset} {formatPct(m.return)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lastPeriod.events.length > 0 && (
              <div>
                <span className="text-terminal-amber">{locale === 'pt-BR' ? 'Eventos relevantes' : 'Key events'}: </span>
                {lastPeriod.events.map((e, i) => (
                  <span key={i} className="mr-2 text-muted-foreground">{t(e.titleKey)}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent history ticker */}
      {dayResults.length > 0 && (
        <Card className="terminal-card">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-xs font-sans text-muted-foreground">
              {locale === 'pt-BR' ? 'Histórico Recente' : 'Recent History'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex gap-3 overflow-x-auto text-xs font-mono scrollbar-terminal">
              {dayResults.slice(-20).map(dr => {
                const ret = (dr.equityAfter - dr.equityBefore) / dr.equityBefore;
                return (
                  <div key={dr.dayIndex} className="shrink-0 text-center">
                    <div className="text-muted-foreground">D{dr.dayIndex}</div>
                    <div className={ret >= 0 ? 'price-up' : 'price-down'}>{formatPct(ret)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <Card className="terminal-card">
      <CardContent className="p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-mono font-semibold mt-0.5 ${negative ? 'price-down' : 'text-foreground'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
