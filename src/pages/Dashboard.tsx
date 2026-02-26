import { useState, useMemo, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { INITIAL_CASH } from '@/engine/params';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, FastForward, TrendingUp, TrendingDown, AlertTriangle, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import type { DayResult, PeriodResult } from '@/engine/types';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { sharpeRatio, volatility, winRate, bestDay, worstDay } from '@/engine/stats';

export default function Dashboard() {
  const { state, locale, equity, advanceDay, fastForward, dayResults, t } = useGame();
  const [lastDay, setLastDay] = useState<DayResult | null>(null);
  const [lastPeriod, setLastPeriod] = useState<PeriodResult | null>(null);
  const navigate = useNavigate();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const showDayNotifications = (r: DayResult) => {
    // Regime change
    if (r.previousRegime !== r.regime) {
      toast.warning(
        locale === 'pt-BR'
          ? `⚡ Regime: ${t(`regime.${r.previousRegime}`)} → ${t(`regime.${r.regime}`)}`
          : `⚡ Regime: ${t(`regime.${r.previousRegime}`)} → ${t(`regime.${r.regime}`)}`,
        { duration: 5000 }
      );
    }
    // Dividends
    if (r.dividendsPaid > 0) {
      toast.success(
        locale === 'pt-BR'
          ? `💰 Dividendos recebidos: ${formatCurrency(r.dividendsPaid)}`
          : `💰 Dividends received: ${formatCurrency(r.dividendsPaid)}`,
        { duration: 4000 }
      );
    }
    // Events (credit watch, defaults, etc.)
    for (const ev of r.events) {
      if (ev.type === 'CREDIT_DOWNGRADE') {
        toast.error(`⚠️ ${t(ev.titleKey)}: ${t(ev.descriptionKey)}`, { duration: 5000 });
      }
    }
  };

  const handleAdvance = useCallback(() => {
    const r = advanceDay();
    setLastDay(r);
    setLastPeriod(null);
    showDayNotifications(r);
  }, [advanceDay]);

  const handleFF = useCallback((days: number) => {
    const r = fastForward(days);
    setLastPeriod(r);
    setLastDay(null);
  }, [fastForward]);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => ({
    'n': () => handleAdvance(),
    'f': () => handleFF(7),
  }), [handleAdvance, handleFF]);
  useKeyboardShortcuts(shortcuts);

  const peak = Math.max(...state.history.equity);
  const currentDD = peak > 0 ? (peak - equity) / peak : 0;
  const maxDD = Math.max(...state.history.drawdown);

  // CDI benchmark comparison
  const cdiValue = state.history.cdiAccumulated[state.history.cdiAccumulated.length - 1] ?? INITIAL_CASH;
  const vsCDI = equity - cdiValue;

  // Advanced stats
  const stats = useMemo(() => ({
    sharpe: sharpeRatio(state.history.equity, state.history.cdiAccumulated),
    vol: volatility(state.history.equity),
    win: winRate(state.history.equity),
    best: bestDay(state.history.equity),
    worst: worstDay(state.history.equity),
  }), [state.history.equity, state.history.cdiAccumulated]);

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label={locale === 'pt-BR' ? 'Patrimônio' : 'Equity'} value={formatCurrency(equity)} />
        <StatCard label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCurrency(state.cash)} />
        <StatCard
          label={locale === 'pt-BR' ? 'vs CDI' : 'vs CDI'}
          value={formatCurrency(vsCDI)}
          negative={vsCDI < 0}
          positive={vsCDI > 0}
        />
        <StatCard label="Sharpe" value={stats.sharpe.toFixed(2)} positive={stats.sharpe > 0} negative={stats.sharpe < 0} />
        <StatCard label={locale === 'pt-BR' ? 'Volatilidade' : 'Volatility'} value={formatPct(stats.vol)} />
        <StatCard label="Win Rate" value={(stats.win * 100).toFixed(0) + '%'} positive={stats.win > 0.5} negative={stats.win < 0.5} />
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
        <Keyboard className="h-3 w-3" />
        <span>N = {locale === 'pt-BR' ? 'Próximo dia' : 'Next day'}</span>
        <span className="text-border">|</span>
        <span>F = {locale === 'pt-BR' ? 'Avançar 7d' : 'Forward 7d'}</span>
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
            <div className="flex gap-6 flex-wrap">
              <div>
                <TrendingUp className="h-3 w-3 inline mr-1 text-terminal-green" />
                {lastDay.marketSummary.topGainers.map(id => (
                  <span
                    key={id}
                    className="mr-2 text-terminal-green cursor-pointer hover:underline"
                    onClick={() => navigate(`/trade?asset=${id}`)}
                  >
                    {id}
                  </span>
                ))}
              </div>
              <div>
                <TrendingDown className="h-3 w-3 inline mr-1 text-terminal-red" />
                {lastDay.marketSummary.topLosers.map(id => (
                  <span
                    key={id}
                    className="mr-2 text-terminal-red cursor-pointer hover:underline"
                    onClick={() => navigate(`/trade?asset=${id}`)}
                  >
                    {id}
                  </span>
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
                    <span
                      key={m.asset}
                      className={`cursor-pointer hover:underline ${m.return >= 0 ? 'price-up' : 'price-down'}`}
                      onClick={() => navigate(`/trade?asset=${m.asset}`)}
                    >
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

function StatCard({ label, value, negative, positive }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <Card className="terminal-card">
      <CardContent className="p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-mono font-semibold mt-0.5 ${negative ? 'price-down' : positive ? 'price-up' : 'text-foreground'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
