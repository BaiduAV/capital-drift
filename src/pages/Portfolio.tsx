import { useState, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, Lightbulb } from 'lucide-react';
import AssetDetailModal from '@/components/game/AssetDetailModal';
import RebalancePanel from '@/components/game/RebalancePanel';
import { generateRecommendations } from '@/engine/recommendations';
import { INITIAL_CASH } from '@/engine/params';

// Design System
import { PageHeader } from '@/components/ui/PageHeader';
import { KPIChip } from '@/components/ui/KPIChip';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataTable } from '@/components/ui/DataTable';

const CLASS_COLORS: Record<string, string> = {
  RF_POS: 'hsl(210, 70%, 55%)',
  RF_PRE: 'hsl(210, 50%, 45%)',
  RF_IPCA: 'hsl(185, 70%, 50%)',
  DEBENTURE: 'hsl(250, 50%, 55%)',
  STOCK: 'hsl(140, 70%, 50%)',
  ETF: 'hsl(35, 90%, 55%)',
  FII: 'hsl(330, 60%, 55%)',
  CRYPTO_MAJOR: 'hsl(45, 90%, 55%)',
  CRYPTO_ALT: 'hsl(15, 80%, 55%)',
  CASH: 'hsl(220, 10%, 45%)',
};

export default function Portfolio() {
  const { state, locale, equity, t } = useGame();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatCompact = (v: number) =>
    Math.abs(v) >= 1_000_000
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 2 }).format(v)
      : formatCurrency(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const positions = useMemo(() => {
    return Object.entries(state.portfolio).map(([id, pos]) => {
      const asset = state.assets[id];
      const def = state.assetCatalog[id];
      const marketValue = pos.quantity * asset.price;
      const costBasis = pos.quantity * pos.avgPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? pnl / costBasis : 0;
      const weight = equity > 0 ? marketValue / equity : 0;
      return { id, def, pos, asset, marketValue, costBasis, pnl, pnlPct, weight };
    }).sort((a, b) => b.marketValue - a.marketValue);
  }, [state.portfolio, state.assets, state.assetCatalog, equity]);

  const investedTotal = positions.reduce((s, p) => s + p.marketValue, 0);
  const cashWeight = equity > 0 ? state.cash / equity : 0;

  // Macro Exposure Stats
  let eqExposure = 0;
  let rfExposure = 0;
  let crExposure = 0;

  const classAlloc: Record<string, number> = { CASH: state.cash };
  for (const p of positions) {
    const cls = p.def.class;
    classAlloc[cls] = (classAlloc[cls] ?? 0) + p.marketValue;
    if (['STOCK', 'ETF', 'FII'].includes(cls)) eqExposure += p.marketValue;
    if (['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE'].includes(cls)) rfExposure += p.marketValue;
    if (['CRYPTO_MAJOR', 'CRYPTO_ALT'].includes(cls)) crExposure += p.marketValue;
  }

  const pieData = Object.entries(classAlloc)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalReturn = (equity - INITIAL_CASH) / INITIAL_CASH;
  const peak = Math.max(...state.history.equity);
  const currentDD = peak > 0 ? (peak - equity) / peak : 0;

  // Risk Hints
  const riskHints = [];
  if (crExposure / equity > 0.2) {
    riskHints.push(locale === 'pt-BR' ? '⚠️ Alta exposição em Cripto (>20%). Volatilidade pode ser extrema.' : '⚠️ High Crypto exposure (>20%). Expect high volatility.');
  }
  if (rfExposure / equity < 0.1) {
    riskHints.push(locale === 'pt-BR' ? '⚠️ Baixa exposição em Renda Fixa (<10%). Pouca proteção contra quedas.' : '⚠️ Low Fixed Income exposure (<10%). Little downside protection.');
  }
  if (positions.length > 0 && positions[0].weight > 0.3) {
    riskHints.push(locale === 'pt-BR' ? `⚠️ Concentração alta: ${positions[0].id} representa ${(positions[0].weight * 100).toFixed(1)}% do portfólio.` : `⚠️ High concentration: ${positions[0].id} is ${(positions[0].weight * 100).toFixed(1)}% of your portfolio.`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title={locale === 'pt-BR' ? 'Sua Carteira' : 'Your Portfolio'}
        subtitle={locale === 'pt-BR' ? 'Visão detalhada de risco e performance.' : 'Detailed view of risk and performance.'}
      >
        <div className="flex gap-2 items-center flex-wrap">
          <KPIChip label={locale === 'pt-BR' ? 'Retorno' : 'Return'} value={formatPct(totalReturn)} trend={totalReturn >= 0 ? 'up' : 'down'} />
          <KPIChip label="Drawdown" value={formatPct(-currentDD)} trend={currentDD > 0.1 ? 'down' : 'neutral'} />
          <KPIChip label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={`${(cashWeight * 100).toFixed(1)}%`} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Col: Risco & Macro Allocation */}
        <div className="space-y-4 lg:col-span-1">
          <SectionCard title={locale === 'pt-BR' ? 'Alocação por Classe' : 'Allocation by Class'}>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    stroke="hsl(220, 20%, 7%)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CLASS_COLORS[entry.name] ?? 'hsl(220, 10%, 35%)'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(220, 20%, 10%)', border: '1px solid hsl(220, 10%, 25%)', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(v: number) => [formatCurrency(v)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full text-xs font-mono mt-4">
                {pieData.map(d => (
                  <div key={d.name} className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: CLASS_COLORS[d.name] ?? 'hsl(220, 10%, 35%)' }} />
                      <span className="text-muted-foreground truncate text-[10px]">{d.name}</span>
                    </div>
                    <span className="text-foreground text-[10px] font-semibold">{equity > 0 ? (d.value / equity * 100).toFixed(1) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={locale === 'pt-BR' ? 'Riscos e Alertas' : 'Risks & Alerts'}>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Renda Fixa' : 'Fixed Income'}</span>
                <span>{(rfExposure / equity * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Renda Variável' : 'Equity'}</span>
                <span>{(eqExposure / equity * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs font-mono mb-4">
                <span className="text-muted-foreground">Crypto</span>
                <span>{(crExposure / equity * 100 || 0).toFixed(1)}%</span>
              </div>

              {riskHints.length === 0 ? (
                <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <ShieldAlert className="h-3 w-3 text-[hsl(var(--terminal-green))]" />
                  {locale === 'pt-BR' ? 'A carteira parece balanceada.' : 'Portfolio seems balanced.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {riskHints.map((hint, i) => (
                    <div key={i} className="text-xs text-[hsl(var(--terminal-amber))] font-mono flex items-start gap-1">
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <RebalancePanel />
        </div>

        {/* Right Col: Positions Table */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title={locale === 'pt-BR' ? 'Posições' : 'Positions'} noPadding>
            <DataTable
              data={positions}
              keyExtractor={p => p.id}
              onRowClick={p => setSelectedAsset(p.id)}
              emptyMessage={locale === 'pt-BR' ? 'Nenhuma posição na carteira.' : 'No open positions.'}
              columns={[
                {
                  key: 'asset',
                  header: locale === 'pt-BR' ? 'Ativo' : 'Asset',
                  render: p => (
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground font-mono">{p.id}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">{t(`class.${p.def.class}`)}</span>
                    </div>
                  )
                },
                {
                  key: 'qty_cost',
                  header: locale === 'pt-BR' ? 'Posição (PM)' : 'Position (Avg)',
                  align: 'right',
                  className: 'hidden sm:table-cell',
                  render: p => (
                    <div className="flex flex-col items-end font-mono">
                      <span className="text-xs">{p.pos.quantity}</span>
                      <span className="text-[10px] text-muted-foreground">@ {formatCurrency(p.pos.avgPrice)}</span>
                    </div>
                  )
                },
                {
                  key: 'current',
                  header: locale === 'pt-BR' ? 'Atual' : 'Current',
                  align: 'right',
                  render: p => (
                    <div className="flex flex-col items-end font-mono">
                      <span className="text-xs text-foreground">{formatCurrency(p.marketValue)}</span>
                      <span className="text-[10px] text-muted-foreground">{formatCurrency(p.asset.price)}/un</span>
                    </div>
                  )
                },
                {
                  key: 'pnl',
                  header: 'PnL',
                  align: 'right',
                  render: p => (
                    <div className="flex flex-col items-end font-mono">
                      <span className={p.pnl >= 0 ? 'price-up text-xs font-semibold' : 'price-down text-xs font-semibold'}>
                        {formatCurrency(p.pnl)}
                      </span>
                      <span className={p.pnlPct >= 0 ? 'price-up text-[10px]' : 'price-down text-[10px]'}>
                        {formatPct(p.pnlPct)}
                      </span>
                    </div>
                  )
                },
                {
                  key: 'weight',
                  header: locale === 'pt-BR' ? 'Peso' : 'Weight',
                  align: 'right',
                  render: p => (
                    <div className="flex items-center justify-end gap-2 font-mono">
                      <div className="w-12 h-1.5 bg-muted/40 rounded-full overflow-hidden hidden md:block">
                        <div className="h-full bg-primary/70" style={{ width: `${p.weight * 100}%` }} />
                      </div>
                      <span className="text-xs w-10 text-right">{(p.weight * 100).toFixed(1)}%</span>
                    </div>
                  )
                }
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <AssetDetailModal assetId={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
