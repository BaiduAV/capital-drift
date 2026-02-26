import { useMemo, useRef, useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { INITIAL_CASH } from '@/engine/params';
import { volatility } from '@/engine/stats';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { RegimeId } from '@/engine/types';

function TrendArrow({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const up = current > previous + 0.0001;
  const down = current < previous - 0.0001;
  if (up) return <ArrowUp className="h-3 w-3 text-terminal-green animate-trend-bounce" />;
  if (down) return <ArrowDown className="h-3 w-3 text-terminal-red animate-trend-bounce" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function MacroItem({ label, value, trend, flash }: { label: string; value: string; trend?: React.ReactNode; flash?: boolean }) {
  const [key, setKey] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setKey(k => k + 1);
      prevValue.current = value;
    }
  }, [value]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-secondary/50 border border-border transition-colors duration-300">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</span>
      <span
        key={key}
        className={`text-xs font-mono font-semibold text-foreground ml-auto ${flash !== false ? 'animate-value-flash' : ''}`}
      >
        {value}
      </span>
      {trend}
    </div>
  );
}

const regimeGlowColors: Record<RegimeId, string> = {
  CALM: 'transparent',
  BULL: 'hsl(140 70% 50% / 0.3)',
  BEAR: 'hsl(35 90% 55% / 0.3)',
  CRISIS: 'hsl(0 72% 55% / 0.4)',
  CRYPTO_EUPHORIA: 'hsl(35 90% 55% / 0.3)',
};

export default function MacroPanel() {
  const { state, prevMacro, locale, equity } = useGame();
  const { macro, regime } = state;
  const [prevRegime, setPrevRegime] = useState<RegimeId>(regime);
  const [regimeTransition, setRegimeTransition] = useState(false);

  useEffect(() => {
    if (regime !== prevRegime) {
      setRegimeTransition(true);
      const timer = setTimeout(() => {
        setRegimeTransition(false);
        setPrevRegime(regime);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [regime, prevRegime]);

  const selic = macro.baseRateAnnual;
  const cdiDaily = selic / 252;
  const ipca = macro.inflationAnnual;

  const peak = Math.max(...state.history.equity);
  const currentDD = peak > 0 ? (peak - equity) / peak : 0;

  const cdiValue = state.history.cdiAccumulated[state.history.cdiAccumulated.length - 1] ?? INITIAL_CASH;
  const vsCDI = equity - cdiValue;

  const riskIndex = useMemo(() => {
    const regimeScore: Record<string, number> = { CALM: 10, BULL: 20, BEAR: 50, CRISIS: 80, CRYPTO_EUPHORIA: 60 };
    const rScore = regimeScore[regime] ?? 30;
    const ddScore = Math.min(currentDD * 200, 40);
    const vol = volatility(state.history.equity);
    const volScore = Math.min(vol * 80, 30);
    return Math.min(100, Math.round(rScore * 0.4 + ddScore + volScore));
  }, [regime, currentDD, state.history.equity]);

  const regimeLabels: Record<string, Record<RegimeId, string>> = {
    'pt-BR': { CALM: 'Calmo', BULL: 'Bull', BEAR: 'Bear', CRISIS: 'Crise', CRYPTO_EUPHORIA: 'Euforia' },
    'en': { CALM: 'Calm', BULL: 'Bull', BEAR: 'Bear', CRISIS: 'Crisis', CRYPTO_EUPHORIA: 'Euphoria' },
  };

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
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded border border-border bg-secondary/50 transition-all duration-500 ${
          regimeTransition ? 'scale-105' : ''
        } ${regime === 'CRISIS' || regime === 'BULL' || regime === 'CRYPTO_EUPHORIA' ? 'animate-regime-glow' : ''}`}
        style={{ '--regime-glow-color': regimeGlowColors[regime] } as React.CSSProperties}
      >
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Regime</span>
        <span className={`regime-badge ml-auto regime-${regime} transition-all duration-500 ${regimeTransition ? 'animate-scale-in' : ''}`}>
          {regimeLabels[locale]?.[regime] ?? regime}
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
