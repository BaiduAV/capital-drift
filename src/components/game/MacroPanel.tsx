import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { INITIAL_CASH } from '@/engine/params';
import { volatility } from '@/engine/stats';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

function TrendArrow({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (current > previous + 0.0001) return <ArrowUp className="h-3 w-3 text-[hsl(var(--terminal-green))]" />;
  if (current < previous - 0.0001) return <ArrowDown className="h-3 w-3 text-[hsl(var(--terminal-red))]" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function MacroItem({ label, value, trend }: { label: string; value: string; trend?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-secondary/50 border border-border">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</span>
      <span className="text-xs font-mono font-semibold text-foreground ml-auto">{value}</span>
      {trend}
    </div>
  );
}

export default function MacroPanel() {
  const { state, prevMacro, locale, equity } = useGame();
  const { macro, regime } = state;

  const selic = macro.baseRateAnnual;
  const cdiDaily = selic / 252;
  const ipca = macro.inflationAnnual;

  const peak = Math.max(...state.history.equity);
  const currentDD = peak > 0 ? (peak - equity) / peak : 0;

  const cdiValue = state.history.cdiAccumulated[state.history.cdiAccumulated.length - 1] ?? INITIAL_CASH;
  const vsCDI = equity - cdiValue;

  // Risk index: 0-100 based on regime + drawdown + volatility
  const riskIndex = useMemo(() => {
    const regimeScore: Record<string, number> = { CALM: 10, BULL: 20, BEAR: 50, CRISIS: 80, CRYPTO_EUPHORIA: 60 };
    const rScore = regimeScore[regime] ?? 30;
    const ddScore = Math.min(currentDD * 200, 40); // max 40 from drawdown
    const vol = volatility(state.history.equity);
    const volScore = Math.min(vol * 80, 30); // max 30 from vol
    return Math.min(100, Math.round(rScore * 0.4 + ddScore + volScore));
  }, [regime, currentDD, state.history.equity]);

  const regimeLabel = locale === 'pt-BR'
    ? { CALM: 'Calmo', BULL: 'Bull', BEAR: 'Bear', CRISIS: 'Crise', CRYPTO_EUPHORIA: 'Euforia' }
    : { CALM: 'Calm', BULL: 'Bull', BEAR: 'Bear', CRISIS: 'Crisis', CRYPTO_EUPHORIA: 'Euphoria' };

  const formatPct = (v: number) => (v * 100).toFixed(2) + '%';
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
      <MacroItem
        label="SELIC"
        value={formatPct(selic)}
        trend={<TrendArrow current={selic} previous={prevMacro?.baseRateAnnual} />}
      />
      <MacroItem
        label={locale === 'pt-BR' ? 'CDI/dia' : 'CDI/day'}
        value={(cdiDaily * 100).toFixed(4) + '%'}
      />
      <MacroItem
        label="IPCA"
        value={formatPct(ipca)}
        trend={<TrendArrow current={ipca} previous={prevMacro?.inflationAnnual} />}
      />
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-border bg-secondary/50">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{locale === 'pt-BR' ? 'Regime' : 'Regime'}</span>
        <span className={`regime-badge ml-auto regime-${regime}`}>
          {regimeLabel[locale === 'pt-BR' ? 'pt-BR' : 'en']?.[regime] ?? regime}
        </span>
      </div>
      <MacroItem
        label={locale === 'pt-BR' ? 'Risco' : 'Risk'}
        value={String(riskIndex)}
      />
      <MacroItem
        label="vs CDI"
        value={formatCurrency(vsCDI)}
      />
    </div>
  );
}
