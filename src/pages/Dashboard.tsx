import { useState, useMemo, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { INITIAL_CASH } from '@/engine/params';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, FastForward, AlertTriangle, TrendingUp, TrendingDown, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import type { DayResult, PeriodResult } from '@/engine/types';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { generateNarrative } from '@/utils/generateNarrative';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import MacroPanel from '@/components/game/MacroPanel';
import NewsFeed from '@/components/game/NewsFeed';
import PortfolioHealth from '@/components/game/PortfolioHealth';
import QuickActions from '@/components/game/QuickActions';

// New Design System imports
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataTable } from '@/components/ui/DataTable';
import { KPIChip } from '@/components/ui/KPIChip';

export default function Dashboard() {
  const { state, locale, equity, advanceDay, fastForward, dayResults, t } = useGame();
  const [lastDay, setLastDay] = useState<DayResult | null>(null);
  const [lastPeriod, setLastPeriod] = useState<PeriodResult | null>(null);
  const navigate = useNavigate();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const showDayNotifications = (r: DayResult) => {
    if (r.previousRegime !== r.regime) {
      toast.warning(`⚡ Regime: ${t(`regime.${r.previousRegime}`)} → ${t(`regime.${r.regime}`)}`, { duration: 5000 });
    }
    if (r.dividendsPaid > 0) {
      toast.success(
        locale === 'pt-BR'
          ? `💰 Dividendos recebidos: ${formatCurrency(r.dividendsPaid)}`
          : `💰 Dividends received: ${formatCurrency(r.dividendsPaid)}`,
        { duration: 4000 }
      );
    }
    for (const ev of r.events) {
      if (ev.type === 'CREDIT_DOWNGRADE') {
        toast.error(`⚠️ ${t(ev.titleKey, ev.vars)}: ${t(ev.descriptionKey, ev.vars)}`, { duration: 5000 });
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

  const shortcuts = useMemo(() => ({
    'n': () => handleAdvance(),
    'f': () => handleFF(7),
  }), [handleAdvance, handleFF]);
  useKeyboardShortcuts(shortcuts);

  // Narrative
  const peak = Math.max(...state.history.equity);
  const currentDD = peak > 0 ? (peak - equity) / peak : 0;
  const lastEvents = dayResults.length > 0 ? dayResults[dayResults.length - 1].events : [];

  const narrative = useMemo(() => generateNarrative({
    regime: state.regime,
    lastEvents,
    drawdown: currentDD,
    inflationAnnual: state.macro.inflationAnnual,
    baseRateAnnual: state.macro.baseRateAnnual,
    locale,
  }), [state.regime, lastEvents, currentDD, state.macro.inflationAnnual, state.macro.baseRateAnnual, locale]);

  // Chart data: nominal + real equity + CDI (using accumulated inflation from history)
  const chartData = useMemo(() => {
    return state.history.equity.map((eq, i) => {
      const inflFactor = state.history.inflationAccumulated?.[i] ?? 1;
      return {
        day: i,
        nominal: Math.round(eq * 100) / 100,
        real: Math.round((eq / inflFactor) * 100) / 100,
        cdi: Math.round((state.history.cdiAccumulated[i] ?? INITIAL_CASH) * 100) / 100,
      };
    });
  }, [state.history.equity, state.history.cdiAccumulated, state.history.inflationAccumulated]);

  // Top positions for snapshot table
  const topPositions = useMemo(() => {
    return Object.entries(state.portfolio)
      .map(([id, pos]) => {
        const asset = state.assets[id];
        const costBasis = pos.quantity * pos.avgPrice;
        const marketValue = pos.quantity * asset.price;
        const pnl = marketValue - costBasis;
        return { id, quantity: pos.quantity, avgPrice: pos.avgPrice, price: asset.price, pnl, marketValue };
      })
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 3);
  }, [state.portfolio, state.assets]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={locale === 'pt-BR' ? 'Mission Control' : 'Mission Control'}
        subtitle={narrative}
      >
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mr-2">
            <Keyboard className="h-3 w-3" />
            <span>N={locale === 'pt-BR' ? 'Próximo' : 'Next'}</span>
            <span className="text-border">|</span>
            <span>F=7d</span>
          </div>
          <Button onClick={handleAdvance} size="sm" className="gap-1.5 font-mono text-xs shadow-md">
            <Play className="h-3.5 w-3.5" />
            {locale === 'pt-BR' ? 'Avançar Dia' : 'Next Day'}
          </Button>
          <Button onClick={() => handleFF(7)} variant="secondary" size="sm" className="gap-1.5 font-mono text-xs shadow-md hidden sm:flex">
            <FastForward className="h-3.5 w-3.5" />
            7d
          </Button>
        </div>
      </PageHeader>

      {/* Row 1: Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          label={locale === 'pt-BR' ? 'Patrimônio' : 'Equity'}
          value={formatCurrency(equity)}
        />
        <StatCard
          label={locale === 'pt-BR' ? 'Retorno Total' : 'Total Return'}
          value={formatPct((equity - INITIAL_CASH) / INITIAL_CASH)}
          trend={equity >= INITIAL_CASH ? 'up' : 'down'}
        />
        <StatCard
          label="Drawdown"
          value={formatPct(-currentDD)}
          trend={currentDD > 0.1 ? 'down' : 'neutral'}
        />
        <StatCard
          label={locale === 'pt-BR' ? 'Caixa livre' : 'Free Cash'}
          value={formatPct(equity > 0 ? state.cash / equity : 0)}
          sub={formatCurrency(state.cash)}
        />
        <div className="hidden lg:block">
          <StatCard
            label={locale === 'pt-BR' ? 'Regime Atual' : 'Current Regime'}
            value={
              <span className={`text-[hsl(var(--terminal-${state.regime === 'BULL' || state.regime === 'CRYPTO_EUPHORIA' ? 'green' : state.regime === 'BEAR' || state.regime === 'CRISIS' ? 'red' : 'cyan'}))]`}>
                {t(`regime.${state.regime}`)}
              </span>
            }
          />
        </div>
      </div>

      {/* Row 2: Main Chart + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Chart */}
        <SectionCard
          title={locale === 'pt-BR' ? 'Performance do Patrimônio' : 'Equity Performance'}
          className="lg:col-span-2 h-[340px]"
          contentClassName="p-2 sm:p-4"
          action={
            <div className="flex gap-2">
              <KPIChip label="CDI" value={formatCurrency(state.history.cdiAccumulated[state.history.cdiAccumulated.length - 1] ?? INITIAL_CASH)} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 15% 18%)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: 'hsl(140 60% 70%)' }}
              />
              <Area dataKey="nominal" stroke="hsl(140, 70%, 50%)" fill="hsl(140, 70%, 50%)" fillOpacity={0.08} strokeWidth={1.5} name={locale === 'pt-BR' ? 'Nominal' : 'Nominal'} dot={false} />
              <Line dataKey="real" stroke="hsl(185, 70%, 50%)" strokeWidth={1} strokeDasharray="4 2" name={locale === 'pt-BR' ? 'Real' : 'Real'} dot={false} />
              <Line dataKey="cdi" stroke="hsl(220, 10%, 50%)" strokeWidth={1} strokeDasharray="2 2" name="CDI" dot={false} />
              {/* @ts-ignore - Recharts ReferenceLine TS issue */}
              {peak > 0 && <ReferenceLine y={peak} stroke="hsl(35, 90%, 55%)" strokeDasharray="3 3" strokeWidth={0.5} />}
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Right Stack */}
        <div className="flex flex-col gap-3 lg:h-[340px]">
          <div className="shrink-0">
            <MacroPanel />
          </div>
          <SectionCard title={locale === 'pt-BR' ? 'Feed de Notícias' : 'News Feed'} className="flex-1 min-h-0 overflow-hidden" noPadding>
            <NewsFeed />
          </SectionCard>
        </div>
      </div>

      {/* Row 3: Portfolio Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <SectionCard title={locale === 'pt-BR' ? 'Top Posições' : 'Top Positions'} className="lg:col-span-2" noPadding>
          <DataTable
            data={topPositions}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => navigate(`/trade?asset=${item.id}`)}
            emptyMessage={locale === 'pt-BR' ? 'Nenhuma posição na carteira.' : 'No positions in portfolio.'}
            emptyAction={<Button size="sm" onClick={() => navigate('/market')}>{locale === 'pt-BR' ? 'Ir para Mercado' : 'Go to Market'}</Button>}
            columns={[
              { key: 'id', header: locale === 'pt-BR' ? 'Ativo' : 'Asset', render: (item) => <span className="font-semibold">{item.id}</span> },
              { key: 'qty', header: 'Qty', align: 'right', render: (item) => item.quantity },
              { key: 'price', header: locale === 'pt-BR' ? 'Preço' : 'Price', align: 'right', render: (item) => formatCurrency(item.price) },
              {
                key: 'pnl', header: 'PnL', align: 'right', render: (item) => (
                  <span className={item.pnl >= 0 ? 'price-up' : 'price-down'}>{formatCurrency(item.pnl)}</span>
                )
              }
            ]}
          />
        </SectionCard>
        <div className="flex flex-col gap-3">
          <QuickActions />
          <PortfolioHealth />
        </div>
      </div>

      {/* Day Result */}
      {lastDay && <DayResultCard day={lastDay} locale={locale} formatPct={formatPct} navigate={navigate} t={t} />}

      {/* Period Result */}
      {lastPeriod && <PeriodResultCard period={lastPeriod} locale={locale} formatPct={formatPct} navigate={navigate} t={t} />}

      {/* Recent history ticker */}
      {dayResults.length > 0 && (
        <Card className="terminal-card">
          <CardContent className="px-4 py-2">
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

// ── Extracted sub-components ──

function DayResultCard({ day, locale, formatPct, navigate, t }: {
  day: DayResult; locale: string; formatPct: (v: number) => string;
  navigate: (path: string) => void; t: (key: string) => string;
}) {
  return (
    <Card className="terminal-card animate-fade-in">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm font-sans">
          {locale === 'pt-BR' ? `Dia ${day.dayIndex}` : `Day ${day.dayIndex}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2 text-xs font-mono">
        <div className="flex gap-4">
          <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Retorno' : 'Return'}:</span>
          <span className={day.equityAfter >= day.equityBefore ? 'price-up' : 'price-down'}>
            {formatPct((day.equityAfter - day.equityBefore) / day.equityBefore)}
          </span>
        </div>
        {day.events.length > 0 && (
          <div className="space-y-1">
            <span className="text-[hsl(var(--terminal-amber))] flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {locale === 'pt-BR' ? 'Eventos' : 'Events'}
            </span>
            {day.events.map((e, i) => (
              <div key={i} className="pl-4 text-muted-foreground">
                <span className="text-foreground">{t(e.titleKey, e.vars)}</span> — {t(e.descriptionKey, e.vars)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodResultCard({ period, locale, formatPct, navigate, t }: {
  period: PeriodResult; locale: string; formatPct: (v: number) => string;
  navigate: (path: string) => void; t: (key: string) => string;
}) {
  return (
    <Card className="terminal-card animate-fade-in">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm font-sans">
          {locale === 'pt-BR'
            ? `Dias ${period.startDay}–${period.endDay}`
            : `Days ${period.startDay}–${period.endDay}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2 text-xs font-mono">
        <div className="flex gap-6">
          <div>
            <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Retorno' : 'Return'}: </span>
            <span className={period.totalReturn >= 0 ? 'price-up' : 'price-down'}>{formatPct(period.totalReturn)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max DD: </span>
            <span className="price-down">{formatPct(-period.maxDrawdown)}</span>
          </div>
        </div>
        {period.topMovers.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {period.topMovers.map(m => (
              <span key={m.asset} className={`cursor-pointer hover:underline ${m.return >= 0 ? 'price-up' : 'price-down'}`} onClick={() => navigate(`/trade?asset=${m.asset}`)}>
                {m.asset} {formatPct(m.return)}
              </span>
            ))}
          </div>
        )}
        {period.events.length > 0 && (
          <div>
            <span className="text-[hsl(var(--terminal-amber))]">{locale === 'pt-BR' ? 'Eventos' : 'Events'}: </span>
            {period.events.map((e, i) => (
              <span key={i} className="mr-2 text-muted-foreground">{t(e.titleKey, e.vars)}</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
