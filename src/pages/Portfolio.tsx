import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import AssetDetailModal from '@/components/game/AssetDetailModal';

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
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const positions = Object.entries(state.portfolio).map(([id, pos]) => {
    const asset = state.assets[id];
    const def = state.assetCatalog[id];
    const marketValue = pos.quantity * asset.price;
    const costBasis = pos.quantity * pos.avgPrice;
    const pnl = marketValue - costBasis;
    const pnlPct = costBasis > 0 ? pnl / costBasis : 0;
    const weight = equity > 0 ? marketValue / equity : 0;
    return { id, def, pos, asset, marketValue, costBasis, pnl, pnlPct, weight };
  }).sort((a, b) => b.marketValue - a.marketValue);

  const investedTotal = positions.reduce((s, p) => s + p.marketValue, 0);
  const cashWeight = equity > 0 ? state.cash / equity : 0;

  // Allocation by class
  const classAlloc: Record<string, number> = { CASH: state.cash };
  for (const p of positions) {
    const cls = p.def.class;
    classAlloc[cls] = (classAlloc[cls] ?? 0) + p.marketValue;
  }
  const pieData = Object.entries(classAlloc)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Allocation summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={locale === 'pt-BR' ? 'Investido' : 'Invested'} value={formatCurrency(investedTotal)} />
        <StatCard label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCurrency(state.cash)} sub={`${(cashWeight * 100).toFixed(1)}%`} />
        <StatCard label={locale === 'pt-BR' ? 'Posições' : 'Positions'} value={String(positions.length)} />
      </div>

      {/* Allocation pie chart */}
      {pieData.length > 0 && (
        <Card className="terminal-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-sans">
              {locale === 'pt-BR' ? 'Alocação por Classe' : 'Allocation by Class'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={160} className="max-w-[200px]">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={70}
                    dataKey="value"
                    stroke="hsl(220, 20%, 7%)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CLASS_COLORS[entry.name] ?? 'hsl(220, 10%, 35%)'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 20%, 10%)',
                      border: '1px solid hsl(220, 10%, 25%)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(v: number) => [formatCurrency(v)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 text-xs font-mono flex-1 min-w-0">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: CLASS_COLORS[d.name] ?? 'hsl(220, 10%, 35%)' }}
                    />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="ml-auto text-foreground">{equity > 0 ? (d.value / equity * 100).toFixed(1) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {positions.length === 0 ? (
        <Card className="terminal-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground font-mono">
            {locale === 'pt-BR' ? 'Nenhuma posição. Vá para Negociar para comprar ativos.' : 'No positions. Go to Trade to buy assets.'}
          </CardContent>
        </Card>
      ) : (
        <Card className="terminal-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{locale === 'pt-BR' ? 'Ativo' : 'Asset'}</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'PM' : 'Avg'}</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Preço' : 'Price'}</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Valor' : 'Value'}</TableHead>
                  <TableHead className="text-xs text-right">P&L</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Peso' : 'Weight'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map(p => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAsset(p.id)}
                  >
                    <TableCell className="text-xs font-mono">
                      <span className="text-foreground font-medium">{p.id}</span>
                      <span className="text-muted-foreground ml-1.5">{t(p.def.nameKey)}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right">{p.pos.quantity}</TableCell>
                    <TableCell className="text-xs font-mono text-right">{p.pos.avgPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono text-right">{p.asset.price.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono text-right">{formatCurrency(p.marketValue)}</TableCell>
                    <TableCell className={`text-xs font-mono text-right ${p.pnl >= 0 ? 'price-up' : 'price-down'}`}>
                      {formatCurrency(p.pnl)} ({formatPct(p.pnlPct)})
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-muted-foreground">
                      {(p.weight * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AssetDetailModal assetId={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="terminal-card">
      <CardContent className="p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-sm font-mono font-semibold mt-0.5 text-foreground">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
