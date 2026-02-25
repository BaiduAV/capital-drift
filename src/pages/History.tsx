import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { INITIAL_CASH } from '@/engine/params';

export default function History() {
  const { state, locale, dayResults, t } = useGame();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  // Build equity curve from state.history
  const eqData = state.history.equity;
  const ddData = state.history.drawdown;
  const len = eqData.length;

  // Mini sparkline renderer
  const renderSparkline = (data: number[], height: number, color: string) => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = 100 / (data.length - 1);

    const points = data.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height: `${height}px` }}>
        <polyline fill="none" stroke={color} strokeWidth="0.5" points={points} />
      </svg>
    );
  };

  // Take last 100 points for display
  const displayEq = eqData.slice(-100);
  const displayDD = ddData.slice(-100);

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
          <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
            <span>{formatCurrency(displayEq[0])}</span>
            <span className={displayEq[displayEq.length - 1] >= INITIAL_CASH ? 'price-up' : 'price-down'}>
              {formatCurrency(displayEq[displayEq.length - 1])}
            </span>
          </div>
          {renderSparkline(displayEq, 80, 'hsl(140, 70%, 50%)')}
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
            <span>{locale === 'pt-BR' ? 'Dia' : 'Day'} {Math.max(0, len - 100)}</span>
            <span>{locale === 'pt-BR' ? 'Dia' : 'Day'} {len - 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown */}
      <Card className="terminal-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-sans">Drawdown</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
            <span>0%</span>
            <span className="price-down">{formatPct(-Math.max(...displayDD))}</span>
          </div>
          {renderSparkline(displayDD.map(d => -d), 50, 'hsl(0, 72%, 55%)')}
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
