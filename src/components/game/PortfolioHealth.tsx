import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PortfolioHealth() {
  const { state, equity, locale } = useGame();

  const score = useMemo(() => {
    const monthlyBurn = equity / 6;
    const liquidityMonths = monthlyBurn > 0 ? state.cash / monthlyBurn : 0;
    const liquidityScore = Math.min(40, (liquidityMonths / 6) * 40);

    const positions = Object.entries(state.portfolio).filter(([, p]) => p.quantity > 0);
    let hhi = 0;
    if (positions.length > 0 && equity > 0) {
      const values = positions.map(([id, p]) => {
        const price = state.assets[id]?.price ?? 0;
        return p.quantity * price;
      });
      const total = values.reduce((a, b) => a + b, 0);
      if (total > 0) {
        for (const v of values) {
          hhi += (v / total) ** 2;
        }
      }
    }
    const diversificationScore = positions.length === 0 ? 0 : Math.min(30, (1 - hhi) * 40);

    const peak = Math.max(...state.history.equity);
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    const ddScore = dd < 0.05 ? 30 : dd < 0.10 ? 20 : dd < 0.20 ? 10 : 0;

    return Math.round(liquidityScore + diversificationScore + ddScore);
  }, [state.cash, state.portfolio, state.assets, state.history.equity, equity]);

  const label = score >= 70
    ? { text: locale === 'pt-BR' ? 'Saudável' : 'Healthy', emoji: '🟢' }
    : score >= 40
    ? { text: locale === 'pt-BR' ? 'Moderado' : 'Moderate', emoji: '🟡' }
    : { text: locale === 'pt-BR' ? 'Arriscado' : 'Risky', emoji: '🔴' };

  const barColor = score >= 70
    ? 'hsl(var(--terminal-green))'
    : score >= 40
    ? 'hsl(var(--terminal-amber))'
    : 'hsl(var(--terminal-red))';

  return (
    <Card className="terminal-card">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-sans text-muted-foreground">
          {locale === 'pt-BR' ? 'Saúde do Portfólio' : 'Portfolio Health'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-mono font-bold text-foreground">{score}</span>
          <span className="text-xs font-mono">
            {label.emoji} {label.text}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: barColor }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
