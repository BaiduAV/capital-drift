import { useState, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Scale, Flame, ArrowRightLeft, Lightbulb, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateRecommendations, type Recommendation } from '@/engine/recommendations';
import type { AssetClass } from '@/engine/types';

type Profile = 'conservative' | 'moderate' | 'aggressive';

const PROFILES: Record<Profile, { RF: number; STOCKS: number; FII: number; CRYPTO: number; CASH: number }> = {
  conservative: { RF: 0.60, STOCKS: 0.15, FII: 0.10, CRYPTO: 0.05, CASH: 0.10 },
  moderate:     { RF: 0.30, STOCKS: 0.30, FII: 0.15, CRYPTO: 0.10, CASH: 0.15 },
  aggressive:   { RF: 0.10, STOCKS: 0.35, FII: 0.10, CRYPTO: 0.35, CASH: 0.10 },
};

const CLASS_MAP: Record<string, AssetClass[]> = {
  RF: ['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE'],
  STOCKS: ['STOCK', 'ETF'],
  FII: ['FII'],
  CRYPTO: ['CRYPTO_MAJOR', 'CRYPTO_ALT'],
};

const GROUP_LABELS: Record<string, { pt: string; en: string }> = {
  RF: { pt: 'Renda Fixa', en: 'Fixed Income' },
  STOCKS: { pt: 'Ações/ETFs', en: 'Stocks/ETFs' },
  FII: { pt: 'FIIs', en: 'REITs' },
  CRYPTO: { pt: 'Crypto', en: 'Crypto' },
  CASH: { pt: 'Caixa', en: 'Cash' },
};

const PROFILE_META: Record<Profile, { icon: typeof Shield; pt: string; en: string }> = {
  conservative: { icon: Shield, pt: 'Conservador', en: 'Conservative' },
  moderate: { icon: Scale, pt: 'Moderado', en: 'Moderate' },
  aggressive: { icon: Flame, pt: 'Agressivo', en: 'Aggressive' },
};

function classGroupOf(ac: AssetClass): string {
  for (const [group, classes] of Object.entries(CLASS_MAP)) {
    if ((classes as string[]).includes(ac)) return group;
  }
  return 'OTHER';
}

export default function RebalancePanel() {
  const { state, locale, equity, batchTrades } = useGame();
  const [profile, setProfile] = useState<Profile>('moderate');
  const [confirmPending, setConfirmPending] = useState(false);
  const [open, setOpen] = useState(false);

  const target = PROFILES[profile];

  const currentAlloc = useMemo(() => {
    const alloc: Record<string, number> = { RF: 0, STOCKS: 0, FII: 0, CRYPTO: 0, CASH: 0 };
    if (equity <= 0) return alloc;
    alloc.CASH = state.cash / equity;
    for (const [id, pos] of Object.entries(state.portfolio)) {
      if (pos.quantity <= 0) continue;
      const cat = state.assetCatalog[id];
      if (!cat) continue;
      const val = pos.quantity * (state.assets[id]?.price ?? 0);
      const group = classGroupOf(cat.class);
      if (group in alloc) alloc[group] += val / equity;
    }
    return alloc;
  }, [state.portfolio, state.assets, state.assetCatalog, state.cash, equity]);

  const recommendations = useMemo(
    () => generateRecommendations(state, equity),
    [state.regime, state.macro, state.portfolio, state.assets, state.events.active, state.ipoPipeline, state.cash, equity, state.history.equity],
  );

  const executeRebalance = () => {
    batchTrades(({ buy, sell, getState }) => {
      const catalog = state.assetCatalog;

      // 1. Sell overweight positions
      for (const group of ['RF', 'STOCKS', 'FII', 'CRYPTO'] as const) {
        const currentPct = currentAlloc[group];
        const targetPct = target[group];
        if (currentPct <= targetPct + 0.02) continue; // within tolerance

        const excessPct = currentPct - targetPct;
        const excessValue = excessPct * equity;
        let sold = 0;

        const groupAssets = Object.keys(catalog)
          .filter(id => CLASS_MAP[group]?.some(c => c === catalog[id].class))
          .filter(id => getState().portfolio[id]?.quantity > 0)
          .sort((a, b) => {
            const va = (getState().portfolio[a]?.quantity ?? 0) * (getState().assets[a]?.price ?? 0);
            const vb = (getState().portfolio[b]?.quantity ?? 0) * (getState().assets[b]?.price ?? 0);
            return vb - va;
          });

        for (const id of groupAssets) {
          if (sold >= excessValue) break;
          const pos = getState().portfolio[id];
          if (!pos || pos.quantity <= 0) continue;
          const price = getState().assets[id]?.price ?? 0;
          const remaining = excessValue - sold;
          const qtyToSell = Math.min(pos.quantity, Math.ceil(remaining / price));
          if (qtyToSell > 0) {
            sell(id, qtyToSell);
            sold += qtyToSell * price;
          }
        }
      }

      // 2. Buy underweight groups
      const representativeAssets: Record<string, string[]> = {
        RF: ['TSELIC', 'CDB100'],
        STOCKS: [
          Object.keys(catalog).find(id => catalog[id].class === 'ETF' && catalog[id].sector === 'TOTAL_MARKET') || 'BOVA11',
        ],
        FII: Object.keys(catalog).filter(id => catalog[id].class === 'FII').slice(0, 2),
        CRYPTO: Object.keys(catalog).filter(id => catalog[id].corrGroup === 'CRYPTO').slice(0, 2),
      };

      for (const group of ['RF', 'STOCKS', 'FII', 'CRYPTO'] as const) {
        const currentPct = (() => {
          const s = getState();
          let val = 0;
          const eq = s.cash + Object.entries(s.portfolio).reduce((sum, [id, p]) => sum + p.quantity * (s.assets[id]?.price ?? 0), 0);
          for (const [id, pos] of Object.entries(s.portfolio)) {
            if (pos.quantity <= 0) continue;
            const cat = s.assetCatalog[id];
            if (!cat) continue;
            if (CLASS_MAP[group]?.some(c => c === cat.class)) {
              val += pos.quantity * (s.assets[id]?.price ?? 0);
            }
          }
          return eq > 0 ? val / eq : 0;
        })();

        const targetPct = target[group];
        if (currentPct >= targetPct - 0.02) continue;

        const s = getState();
        const currentEq = s.cash + Object.entries(s.portfolio).reduce((sum, [id, p]) => sum + p.quantity * (s.assets[id]?.price ?? 0), 0);
        const deficit = (targetPct - currentPct) * currentEq;
        const targets = representativeAssets[group] || [];
        const perTarget = deficit / Math.max(targets.length, 1);

        for (const id of targets) {
          const price = getState().assets[id]?.price ?? 50;
          const qty = Math.floor(perTarget / price);
          if (qty > 0) buy(id, qty);
        }
      }
    });

    const labels: Record<Profile, { pt: string; en: string }> = {
      conservative: { pt: 'Conservador', en: 'Conservative' },
      moderate: { pt: 'Moderado', en: 'Moderate' },
      aggressive: { pt: 'Agressivo', en: 'Aggressive' },
    };
    toast.success(
      locale === 'pt-BR'
        ? `Portfólio rebalanceado para perfil ${labels[profile].pt}!`
        : `Portfolio rebalanced to ${labels[profile].en} profile!`,
      { duration: 3000 }
    );
    setConfirmPending(false);
  };

  const handleRebalance = () => {
    if (confirmPending) {
      executeRebalance();
    } else {
      setConfirmPending(true);
      toast.info(
        locale === 'pt-BR' ? 'Clique novamente para confirmar o rebalanceamento.' : 'Click again to confirm rebalancing.',
        { duration: 2000 }
      );
      setTimeout(() => setConfirmPending(false), 3000);
    }
  };

  const groups = ['RF', 'STOCKS', 'FII', 'CRYPTO', 'CASH'] as const;

  return (
    <Card className="terminal-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="py-2 px-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full group cursor-pointer">
            <CardTitle className="text-xs font-sans text-muted-foreground">
              {locale === 'pt-BR' ? 'Rebalanceamento' : 'Rebalance'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
              <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Profile selector */}
            <div className="flex gap-1.5">
              {(['conservative', 'moderate', 'aggressive'] as Profile[]).map((p) => {
                const meta = PROFILE_META[p];
                const Icon = meta.icon;
                return (
                  <Button
                    key={p}
                    variant={profile === p ? 'default' : 'secondary'}
                    size="sm"
                    className="flex-1 gap-1 text-[10px]"
                    onClick={() => { setProfile(p); setConfirmPending(false); }}
                  >
                    <Icon className="h-3 w-3" />
                    {locale === 'pt-BR' ? meta.pt : meta.en}
                  </Button>
                );
              })}
            </div>

            {/* Allocation bars */}
            <div className="space-y-1.5">
              {groups.map((group) => {
                const current = (currentAlloc[group] ?? 0) * 100;
                const tgt = (target[group] ?? 0) * 100;
                const diff = current - tgt;
                const label = locale === 'pt-BR' ? GROUP_LABELS[group].pt : GROUP_LABELS[group].en;

                return (
                  <div key={group} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-foreground">{current.toFixed(0)}%</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-foreground">{tgt.toFixed(0)}%</span>
                        {Math.abs(diff) > 2 && (
                          <span className={cn('text-[9px]', diff > 0 ? 'text-[hsl(var(--terminal-red))]' : 'text-[hsl(var(--terminal-green))]')}>
                            {diff > 0 ? '↓' : '↑'}{Math.abs(diff).toFixed(0)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      {/* Target indicator */}
                      <div
                        className="absolute top-0 h-full border-r-2 border-[hsl(var(--terminal-amber))] z-10"
                        style={{ left: `${Math.min(tgt, 100)}%` }}
                      />
                      {/* Current bar */}
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          Math.abs(diff) <= 2
                            ? 'bg-[hsl(var(--terminal-green))]'
                            : diff > 0
                            ? 'bg-[hsl(var(--terminal-red))]'
                            : 'bg-[hsl(var(--terminal-cyan))]'
                        )}
                        style={{ width: `${Math.min(current, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rebalance button */}
            <Button
              onClick={handleRebalance}
              variant={confirmPending ? 'default' : 'secondary'}
              size="sm"
              className="w-full gap-1.5 text-xs"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {confirmPending
                ? (locale === 'pt-BR' ? 'Confirmar Rebalanceamento' : 'Confirm Rebalance')
                : (locale === 'pt-BR' ? 'Rebalancear' : 'Rebalance')
              }
            </Button>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-border/50">
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 text-[hsl(var(--terminal-amber))]" />
                  {locale === 'pt-BR' ? 'Recomendações' : 'Recommendations'}
                </span>
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="shrink-0">{rec.icon}</span>
                    <span>{locale === 'pt-BR' ? rec.pt : rec.en}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
