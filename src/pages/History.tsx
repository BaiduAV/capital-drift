import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { INITIAL_CASH } from '@/engine/params';
import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';

export default function History() {
  const { state, locale, dayResults, t } = useGame();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const eqData = state.history.equity;
  const ddData = state.history.drawdown;
  const len = eqData.length;

  const displayStart = Math.max(0, len - 100);

  const equityChartData = useMemo(() =>
    eqData.slice(-100).map((v, i) => ({ day: displayStart + i, equity: v })),
    [eqData, displayStart]
  );

  const ddChartData = useMemo(() =>
    ddData.slice(-100).map((v, i) => ({ day: displayStart + i, dd: -(v * 100) })),
    [ddData, displayStart]
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

  return (
    <div className="space-y-4">
      {/* Equity curve */}
      <Card className="terminal-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-sans">
            {locale === 'pt-BR' ? 'Curva de Patrimônio' : 'Equity Curve'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
            <span>{locale === 'pt-BR' ? 'Dia' : 'Day'} {displayStart}–{len - 1}</span>
            <span className={eqData[eqData.length - 1] >= INITIAL_CASH ? 'price-up' : 'price-down'}>
              {formatCurrency(eqData[eqData.length - 1])}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equityChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(140, 70%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(140, 70%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 45%)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v / 1000).toFixed(0) + 'k'} width={40} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), locale === 'pt-BR' ? 'Patrimônio' : 'Equity']} labelFormatter={(l) => `${locale === 'pt-BR' ? 'Dia' : 'Day'} ${l}`} />
              <ReferenceLine y={INITIAL_CASH} stroke="hsl(220, 10%, 30%)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="equity" stroke="hsl(140, 70%, 50%)" fill="url(#eqGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown */}
      <Card className="terminal-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-sans">Drawdown</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
            <span>Max DD</span>
            <span className="price-down">{formatPct(-Math.max(...ddData))}</span>
          </div>
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
              <ReferenceLine y={0} stroke="hsl(220, 10%, 30%)" />
              <Area type="monotone" dataKey="dd" stroke="hsl(0, 72%, 55%)" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Event log */}
      <Card className="terminal-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-sans">
            {locale === 'pt-BR' ? 'Log de Eventos' : 'Event Log'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {dayResults.length === 0 ? (
            <div className="text-xs text-muted-foreground font-mono py-2">
              {locale === 'pt-BR' ? 'Nenhum evento registrado ainda.' : 'No events recorded yet.'}
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-terminal">
              {[...dayResults].reverse().flatMap(dr =>
                dr.events.map((ev, i) => (
                  <div key={`${dr.dayIndex}-${i}`} className="flex gap-2 text-xs font-mono">
                    <span className="text-muted-foreground shrink-0">D{dr.dayIndex}</span>
                    <span className={`regime-badge regime-${dr.regime} shrink-0`}>{t(`regime.${dr.regime}`)}</span>
                    <span className="text-terminal-amber">{t(ev.titleKey)}</span>
                    <span className="text-muted-foreground truncate">{t(ev.descriptionKey)}</span>
                  </div>
                ))
              )}
              {dayResults.every(dr => dr.events.length === 0) && (
                <div className="text-xs text-muted-foreground font-mono py-2">
                  {locale === 'pt-BR' ? 'Nenhum evento nos dias simulados.' : 'No events in simulated days.'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="terminal-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-sans">
            {locale === 'pt-BR' ? 'Estatísticas' : 'Statistics'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 text-xs font-mono space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Dias simulados' : 'Days simulated'}</span>
            <span>{state.dayIndex}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Retorno total' : 'Total return'}</span>
            <span className={eqData[eqData.length - 1] >= INITIAL_CASH ? 'price-up' : 'price-down'}>
              {formatPct((eqData[eqData.length - 1] - INITIAL_CASH) / INITIAL_CASH)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max DD</span>
            <span className="price-down">{formatPct(-Math.max(...ddData))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Pico' : 'Peak'}</span>
            <span>{formatCurrency(Math.max(...eqData))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seed</span>
            <span className="text-muted-foreground">{state.seed}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
