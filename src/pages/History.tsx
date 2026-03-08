import { useGame } from '@/context/GameContext';
import { INITIAL_CASH } from '@/engine/params';
import { useMemo, useState } from 'react';
import { sharpeRatio, volatility, winRate, bestDay, worstDay } from '@/engine/stats';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Line, ComposedChart,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';
import { KPIChip } from '@/components/ui/KPIChip';

type HistoryTab = 'performance' | 'macro' | 'events' | 'stats';

export default function History() {
  const { state, locale, dayResults, t } = useGame();
  const [activeTab, setActiveTab] = useState<HistoryTab>('performance');
  const [range, setRange] = useState<number>(100); // last N days

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const eqData = state.history.equity;
  const ddData = state.history.drawdown;
  const cdiData = state.history.cdiAccumulated;
  const len = eqData.length;

  const displayStart = Math.max(0, len - range);

  const equityChartData = useMemo(() =>
    eqData.slice(-range).map((v, i) => ({
      day: displayStart + i,
      equity: v,
      cdi: cdiData[displayStart + i] ?? INITIAL_CASH,
    })),
    [eqData, cdiData, displayStart, range]
  );

  const ddChartData = useMemo(() =>
    ddData.slice(-range).map((v, i) => ({ day: displayStart + i, dd: -(v * 100) })),
    [ddData, displayStart, range]
  );

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(220, 20%, 10%)',
      border: '1px solid hsl(220, 10%, 25%)',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: 'monospace',
    },
    labelStyle: { color: 'hsl(220, 10%, 60%)' },
  };

  const currentCDI = cdiData[cdiData.length - 1] ?? INITIAL_CASH;
  const currentEquity = eqData[eqData.length - 1];
  const beatingCDI = currentEquity >= currentCDI;

  // Events timeline
  const allEvents = useMemo(() => {
    return [...dayResults]
      .reverse()
      .flatMap(dr =>
        dr.events.map((ev, i) => ({
          key: `${dr.dayIndex}-${i}`,
          day: dr.dayIndex,
          regime: dr.regime,
          title: t(ev.titleKey, ev.vars),
          description: t(ev.descriptionKey, ev.vars),
          type: ev.type,
        }))
      );
  }, [dayResults, t]);

  // Macro history from dayResults
  const macroChartData = useMemo(() => {
    if (dayResults.length === 0) return [];
    return dayResults.slice(-range).map(dr => ({
      day: dr.dayIndex,
      selic: dr.state.macro.baseRateAnnual * 100,
      ipca: dr.state.macro.inflationAnnual * 100,
      usdBrl: dr.state.macro.fxUSDBRL,
      risco: dr.state.macro.riskIndex,
      atividade: dr.state.macro.activityAnnual * 100,
    }));
  }, [dayResults, range]);

  const tabs: { key: HistoryTab; label: string }[] = [
    { key: 'performance', label: locale === 'pt-BR' ? 'Performance' : 'Performance' },
    { key: 'macro', label: 'Macro' },
    { key: 'events', label: locale === 'pt-BR' ? 'Eventos' : 'Events' },
    { key: 'stats', label: locale === 'pt-BR' ? 'Estatísticas' : 'Statistics' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={locale === 'pt-BR' ? 'Histórico' : 'History'}
        subtitle={locale === 'pt-BR' ? 'Análise de performance, eventos e estatísticas.' : 'Performance analysis, events and statistics.'}
      >
        <div className="flex items-center gap-2">
          <KPIChip label="vs CDI" value={formatCurrency(currentEquity - currentCDI)} trend={beatingCDI ? 'up' : 'down'} />
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-md p-1 w-fit">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            className="text-xs font-mono h-7"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-4 animate-fade-in">
          {/* Range selector */}
          <div className="flex gap-1">
            {[30, 100, 365, len].map(r => (
              <Button
                key={r}
                variant={range === r ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs font-mono h-6"
                onClick={() => setRange(r)}
              >
                {r >= len ? 'All' : `${r}d`}
              </Button>
            ))}
          </div>

          {/* Equity Chart */}
          <SectionCard
            title={locale === 'pt-BR' ? 'Patrimônio vs CDI' : 'Equity vs CDI'}
            action={
              <span className={`text-xs font-mono ${beatingCDI ? 'price-up' : 'price-down'}`}>
                {beatingCDI ? '▲' : '▼'} {formatCurrency(currentEquity - currentCDI)}
              </span>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={equityChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(140, 70%, 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(140, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v / 1000).toFixed(1) + 'k'} width={40} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [
                    formatCurrency(v),
                    name === 'equity' ? (locale === 'pt-BR' ? 'Patrimônio' : 'Equity') : 'CDI'
                  ]}
                  labelFormatter={(l) => `${locale === 'pt-BR' ? 'Dia' : 'Day'} ${l}`}
                />
                {/* @ts-ignore - Recharts ReferenceLine TS issue */}
                <ReferenceLine y={INITIAL_CASH} stroke="hsl(220, 10%, 30%)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="equity" stroke="hsl(140, 70%, 50%)" fill="url(#eqGrad)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="cdi" stroke="hsl(190, 80%, 55%)" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Drawdown */}
          <SectionCard
            title="Drawdown"
            action={<span className="price-down text-xs font-mono">{formatPct(-Math.max(...ddData))}</span>}
          >
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={ddChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0} />
                    <stop offset="100%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1) + '%'} width={40} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toFixed(2) + '%', 'Drawdown']} labelFormatter={(l) => `${locale === 'pt-BR' ? 'Dia' : 'Day'} ${l}`} />
                {/* @ts-ignore */}
                <ReferenceLine y={0} stroke="hsl(220, 10%, 30%)" />
                <Area type="monotone" dataKey="dd" stroke="hsl(0, 72%, 55%)" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}

      {/* Macro Tab */}
      {activeTab === 'macro' && (
        <div className="space-y-4 animate-fade-in">
          {/* Range selector */}
          <div className="flex gap-1">
            {[30, 100, 365, len].map(r => (
              <Button
                key={r}
                variant={range === r ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs font-mono h-6"
                onClick={() => setRange(r)}
              >
                {r >= len ? 'All' : `${r}d`}
              </Button>
            ))}
          </div>

          {macroChartData.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground font-mono">
              {locale === 'pt-BR' ? 'Avance dias para ver o histórico macro.' : 'Advance days to see macro history.'}
            </div>
          ) : (
            <>
              {/* SELIC & IPCA */}
              <SectionCard
                title={locale === 'pt-BR' ? 'Juros & Inflação' : 'Rates & Inflation'}
                action={
                  <div className="flex gap-3 text-[10px] font-mono">
                    <span className="text-[hsl(45,90%,55%)]">● SELIC</span>
                    <span className="text-[hsl(0,72%,55%)]">● IPCA</span>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={macroChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1) + '%'} width={45} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [
                        v.toFixed(2) + '%',
                        name === 'selic' ? 'SELIC' : 'IPCA'
                      ]}
                      labelFormatter={(l) => `${locale === 'pt-BR' ? 'Dia' : 'Day'} ${l}`}
                    />
                    <Line type="monotone" dataKey="selic" stroke="hsl(45, 90%, 55%)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="ipca" stroke="hsl(0, 72%, 55%)" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </SectionCard>

              {/* USD/BRL */}
              <SectionCard
                title="USD/BRL"
                action={
                  <span className="text-xs font-mono text-muted-foreground">
                    {macroChartData.length > 0 ? macroChartData[macroChartData.length - 1].usdBrl.toFixed(2) : '—'}
                  </span>
                }
              >
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={macroChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fxGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(190, 80%, 55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(190, 80%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} width={45} domain={['auto', 'auto']} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number) => ['R$ ' + v.toFixed(2), 'USD/BRL']}
                      labelFormatter={(l) => `${locale === 'pt-BR' ? 'Dia' : 'Day'} ${l}`}
                    />
                    <Area type="monotone" dataKey="usdBrl" stroke="hsl(190, 80%, 55%)" fill="url(#fxGrad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>

              {/* Risco & Atividade */}
              <SectionCard
                title={locale === 'pt-BR' ? 'Risco & Atividade' : 'Risk & Activity'}
                action={
                  <div className="flex gap-3 text-[10px] font-mono">
                    <span className="text-[hsl(0,72%,55%)]">● {locale === 'pt-BR' ? 'Risco' : 'Risk'}</span>
                    <span className="text-[hsl(140,70%,50%)]">● {locale === 'pt-BR' ? 'Atividade' : 'Activity'}</span>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={150}>
                  <ComposedChart data={macroChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="risk" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(0)} width={30} domain={[0, 100]} />
                    <YAxis yAxisId="activity" orientation="right" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1) + '%'} width={45} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [
                        name === 'risco' ? v.toFixed(0) : v.toFixed(2) + '%',
                        name === 'risco' ? (locale === 'pt-BR' ? 'Risco' : 'Risk') : (locale === 'pt-BR' ? 'Atividade' : 'Activity')
                      ]}
                      labelFormatter={(l) => `${locale === 'pt-BR' ? 'Dia' : 'Day'} ${l}`}
                    />
                    <Line yAxisId="risk" type="monotone" dataKey="risco" stroke="hsl(0, 72%, 55%)" strokeWidth={1.5} dot={false} />
                    <Line yAxisId="activity" type="monotone" dataKey="atividade" stroke="hsl(140, 70%, 50%)" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </SectionCard>
            </>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <SectionCard title={locale === 'pt-BR' ? 'Timeline de Eventos' : 'Event Timeline'} className="animate-fade-in">
          {allEvents.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground font-mono">
              {locale === 'pt-BR' ? 'Nenhum evento registrado.' : 'No events recorded.'}
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto scrollbar-terminal">
              {allEvents.map(ev => (
                <div key={ev.key} className="flex gap-3 text-xs font-mono py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground shrink-0 w-8 text-right">D{ev.day}</span>
                  <span className={`regime-badge regime-${ev.regime} shrink-0 text-[9px]`}>{t(`regime.${ev.regime}`)}</span>
                  <div className="min-w-0">
                    <span className="text-[hsl(var(--terminal-amber))] font-semibold">{ev.title}</span>
                    <span className="text-muted-foreground ml-2 truncate">{ev.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={locale === 'pt-BR' ? 'Dias' : 'Days'} value={String(state.dayIndex)} />
            <StatCard
              label={locale === 'pt-BR' ? 'Retorno Total' : 'Total Return'}
              value={formatPct((currentEquity - INITIAL_CASH) / INITIAL_CASH)}
              trend={currentEquity >= INITIAL_CASH ? 'up' : 'down'}
            />
            <StatCard label="Sharpe" value={sharpeRatio(eqData, cdiData).toFixed(2)} trend={sharpeRatio(eqData, cdiData) > 0 ? 'up' : 'down'} />
            <StatCard label="Win Rate" value={`${(winRate(eqData) * 100).toFixed(1)}%`} trend={winRate(eqData) > 0.5 ? 'up' : 'down'} />
          </div>

          <SectionCard title={locale === 'pt-BR' ? 'Estatísticas Detalhadas' : 'Detailed Statistics'}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono">
              <StatRow label={locale === 'pt-BR' ? 'Retorno CDI' : 'CDI Return'} value={formatPct((currentCDI - INITIAL_CASH) / INITIAL_CASH)} className="text-terminal-cyan" />
              <StatRow label="vs CDI" value={formatCurrency(currentEquity - currentCDI)} className={beatingCDI ? 'price-up' : 'price-down'} />
              <StatRow label="Max DD" value={formatPct(-Math.max(...ddData))} className="price-down" />
              <StatRow label={locale === 'pt-BR' ? 'Pico' : 'Peak'} value={formatCurrency(Math.max(...eqData))} />
              <StatRow label={locale === 'pt-BR' ? 'Volatilidade' : 'Volatility'} value={formatPct(volatility(eqData))} />
              <StatRow label={locale === 'pt-BR' ? 'Melhor dia' : 'Best Day'} value={formatPct(bestDay(eqData))} className="price-up" />
              <StatRow label={locale === 'pt-BR' ? 'Pior dia' : 'Worst Day'} value={formatPct(worstDay(eqData))} className="price-down" />
              <StatRow label="Seed" value={String(state.seed)} className="text-muted-foreground" />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={className ?? 'text-foreground'}>{value}</span>
    </div>
  );
}
