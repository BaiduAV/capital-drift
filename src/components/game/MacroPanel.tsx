import { useMemo, useRef, useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { INITIAL_CASH } from '@/engine/params';
import { volatility } from '@/engine/stats';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RegimeId } from '@/engine/types';

function TrendArrow({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const up = current > previous + 0.0001;
  const down = current < previous - 0.0001;
  if (up) return <ArrowUp className="h-3 w-3 text-terminal-green animate-trend-bounce" />;
  if (down) return <ArrowDown className="h-3 w-3 text-terminal-red animate-trend-bounce" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function MacroItem({ label, value, trend, tooltip }: { label: string; value: string; trend?: React.ReactNode; tooltip?: string }) {
  const [key, setKey] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setKey(k => k + 1);
      prevValue.current = value;
    }
  }, [value]);

  const inner = (
    <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-secondary/50 border border-border transition-colors duration-300 min-w-0 overflow-hidden cursor-help">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider whitespace-nowrap shrink-0 border-b border-dotted border-muted-foreground/40">{label}</span>
      <span key={key} className="text-[11px] font-mono font-semibold text-foreground ml-auto whitespace-nowrap animate-value-flash">
        {value}
      </span>
      {trend && <span className="shrink-0">{trend}</span>}
    </div>
  );

  if (!tooltip) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

const regimeGlowColors: Record<RegimeId, string> = {
  CALM: 'transparent',
  BULL: 'hsl(140 70% 50% / 0.3)',
  BEAR: 'hsl(35 90% 55% / 0.3)',
  CRISIS: 'hsl(0 72% 55% / 0.4)',
  CRYPTO_EUPHORIA: 'hsl(35 90% 55% / 0.3)',
};

const tooltips = {
  'pt-BR': {
    selic: 'Taxa básica de juros da economia. Afeta o rendimento da renda fixa e o custo de crédito. Selic alta favorece RF, baixa favorece ações.',
    ipca: 'Índice de inflação oficial. Corrói o poder de compra. Ativos IPCA+ protegem contra inflação, ações sofrem com inflação alta.',
    usd: 'Câmbio dólar/real. Sobe em crises e fuga de capitais. Impacta empresas exportadoras (positivo) e importadoras (negativo).',
    activity: 'Crescimento econômico anualizado. Atividade forte impulsiona lucros e ações. Recessão pressiona ativos de risco.',
    risk: 'Índice de risco-país (0-100). Mede a percepção de risco do mercado. Alto risco = juros maiores e pressão em ativos.',
    regime: 'Regime de mercado atual. Define a tendência geral: Calmo (neutro), Bull (alta), Bear (queda), Crise (pânico), Euforia (crypto).',
    cdi: 'Rendimento diário do CDI, benchmark da renda fixa. Seu patrimônio precisa render mais que o CDI para valer a pena.',
    drawdown: 'Queda máxima desde o pico. Mede o risco realizado da carteira. Acima de 10% é preocupante.',
  },
  en: {
    selic: 'Base interest rate. Affects fixed income yields and credit costs. High rates favor bonds, low rates favor equities.',
    ipca: 'Official inflation index. Erodes purchasing power. IPCA+ bonds hedge inflation; stocks suffer under high inflation.',
    usd: 'USD/BRL exchange rate. Rises during crises and capital flight. Impacts exporters (positive) and importers (negative).',
    activity: 'Annualized economic growth. Strong activity boosts corporate earnings and equities. Recession pressures risk assets.',
    risk: 'Country risk index (0-100). Measures market risk perception. High risk = higher rates and pressure on assets.',
    regime: 'Current market regime. Defines the overall trend: Calm (neutral), Bull (up), Bear (down), Crisis (panic), Euphoria (crypto).',
    cdi: 'Daily CDI yield, the fixed income benchmark. Your portfolio needs to beat CDI to outperform cash.',
    drawdown: 'Maximum decline from peak. Measures realized portfolio risk. Above 10% is concerning.',
  },
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
  const tt = tooltips[locale] ?? tooltips['en'];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 overflow-hidden">
        <MacroItem
          label="SELIC"
          value={formatPct(macro.baseRateAnnual)}
          trend={<TrendArrow current={macro.baseRateAnnual} previous={prevMacro?.baseRateAnnual} />}
          tooltip={tt.selic}
        />
        <MacroItem
          label="IPCA"
          value={formatPct(macro.inflationAnnual)}
          trend={<TrendArrow current={macro.inflationAnnual} previous={prevMacro?.inflationAnnual} />}
          tooltip={tt.ipca}
        />
        <MacroItem
          label="USD/BRL"
          value={macro.fxUSDBRL.toFixed(2)}
          trend={<TrendArrow current={macro.fxUSDBRL} previous={prevMacro?.fxUSDBRL} />}
          tooltip={tt.usd}
        />
        <MacroItem
          label={locale === 'pt-BR' ? 'Atividade' : 'Activity'}
          value={formatPct(macro.activityAnnual)}
          trend={<TrendArrow current={macro.activityAnnual} previous={prevMacro?.activityAnnual} />}
          tooltip={tt.activity}
        />
        <MacroItem
          label={locale === 'pt-BR' ? 'Risco' : 'Risk'}
          value={(macro.riskIndex * 100).toFixed(0)}
          trend={<TrendArrow current={macro.riskIndex} previous={prevMacro?.riskIndex} />}
          tooltip={tt.risk}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1 px-1.5 py-1 rounded border border-border bg-secondary/50 transition-all duration-500 cursor-help ${regimeTransition ? 'scale-105' : ''
                } ${regime === 'CRISIS' || regime === 'BULL' || regime === 'CRYPTO_EUPHORIA' ? 'animate-regime-glow' : ''}`}
              style={{ '--regime-glow-color': regimeGlowColors[regime] } as React.CSSProperties}
            >
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider border-b border-dotted border-muted-foreground/40">Regime</span>
              <span className={`regime-badge ml-auto text-[10px] regime-${regime} transition-all duration-500 ${regimeTransition ? 'animate-scale-in' : ''}`}>
                {regimeLabels[locale]?.[regime] ?? regime}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-relaxed">
            {tt.regime}
          </TooltipContent>
        </Tooltip>
        <MacroItem
          label={locale === 'pt-BR' ? 'CDI/dia' : 'CDI/day'}
          value={(macro.baseRateAnnual / 252 * 100).toFixed(4) + '%'}
          tooltip={tt.cdi}
        />
        <MacroItem
          label="Drawdown"
          value={(() => {
            const peak = Math.max(...state.history.equity);
            const dd = peak > 0 ? (peak - equity) / peak : 0;
            return dd > 0.001 ? '-' + (dd * 100).toFixed(1) + '%' : '0%';
          })()}
          tooltip={tt.drawdown}
        />
      </div>
    </TooltipProvider>
  );
}
