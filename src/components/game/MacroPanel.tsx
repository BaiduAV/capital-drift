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

function MacroItem({ label, value, trend }: { label: string; value: string; trend?: React.ReactNode }) {
  const [key, setKey] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setKey(k => k + 1);
      prevValue.current = value;
    }
  }, [value]);

  return (
    <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-secondary/50 border border-border transition-colors duration-300 min-w-0 overflow-hidden">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider whitespace-nowrap shrink-0">{label}</span>
      <span key={key} className="text-[11px] font-mono font-semibold text-foreground ml-auto whitespace-nowrap animate-value-flash">
        {value}
      </span>
      {trend && <span className="shrink-0">{trend}</span>}
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

  const regimeLabels: Record<string, Record<RegimeId, string>> = {
    'pt-BR': { CALM: 'Calmo', BULL: 'Bull', BEAR: 'Bear', CRISIS: 'Crise', CRYPTO_EUPHORIA: 'Euforia' },
    'en': { CALM: 'Calm', BULL: 'Bull', BEAR: 'Bear', CRISIS: 'Crisis', CRYPTO_EUPHORIA: 'Euphoria' },
  };

  const formatPct = (v: number) => (v * 100).toFixed(2) + '%';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 overflow-hidden">
      <MacroItem
        label="SELIC"
        value={formatPct(macro.baseRateAnnual)}
        trend={<TrendArrow current={macro.baseRateAnnual} previous={prevMacro?.baseRateAnnual} />}
      />
      <MacroItem
        label="IPCA"
        value={formatPct(macro.inflationAnnual)}
        trend={<TrendArrow current={macro.inflationAnnual} previous={prevMacro?.inflationAnnual} />}
      />
      <MacroItem
        label="USD/BRL"
        value={macro.fxUSDBRL.toFixed(2)}
        trend={<TrendArrow current={macro.fxUSDBRL} previous={prevMacro?.fxUSDBRL} />}
      />
      <MacroItem
        label={locale === 'pt-BR' ? 'Atividade' : 'Activity'}
        value={formatPct(macro.activityAnnual)}
        trend={<TrendArrow current={macro.activityAnnual} previous={prevMacro?.activityAnnual} />}
      />
      <MacroItem
        label={locale === 'pt-BR' ? 'Risco' : 'Risk'}
        value={(macro.riskIndex * 100).toFixed(0)}
        trend={<TrendArrow current={macro.riskIndex} previous={prevMacro?.riskIndex} />}
      />
      <div
        className={`flex items-center gap-1 px-1.5 py-1 rounded border border-border bg-secondary/50 transition-all duration-500 ${regimeTransition ? 'scale-105' : ''
          } ${regime === 'CRISIS' || regime === 'BULL' || regime === 'CRYPTO_EUPHORIA' ? 'animate-regime-glow' : ''}`}
        style={{ '--regime-glow-color': regimeGlowColors[regime] } as React.CSSProperties}
      >
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Regime</span>
        <span className={`regime-badge ml-auto text-[10px] regime-${regime} transition-all duration-500 ${regimeTransition ? 'animate-scale-in' : ''}`}>
          {regimeLabels[locale]?.[regime] ?? regime}
        </span>
      </div>
      <MacroItem
        label={locale === 'pt-BR' ? 'CDI/dia' : 'CDI/day'}
        value={(macro.baseRateAnnual / 252 * 100).toFixed(4) + '%'}
      />
      <MacroItem
        label="Drawdown"
        value={(() => {
          const peak = Math.max(...state.history.equity);
          const dd = peak > 0 ? (peak - equity) / peak : 0;
          return dd > 0.001 ? '-' + (dd * 100).toFixed(1) + '%' : '0%';
        })()}
      />
    </div>
  );
}
