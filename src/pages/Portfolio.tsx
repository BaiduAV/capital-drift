import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Portfolio() {
  const { state, locale, equity, t } = useGame();

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

  return (
    <div className="space-y-4">
      {/* Allocation summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={locale === 'pt-BR' ? 'Investido' : 'Invested'} value={formatCurrency(investedTotal)} />
        <StatCard label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCurrency(state.cash)} sub={`${(cashWeight * 100).toFixed(1)}%`} />
        <StatCard label={locale === 'pt-BR' ? 'Posições' : 'Positions'} value={String(positions.length)} />
      </div>

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
                  <TableRow key={p.id}>
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
