import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { AssetDefinition, AssetState, Position } from '@/engine/types';
import { assetName } from '@/engine/i18n';

interface Props {
  assetId: string | null;
  onClose: () => void;
}

export default function AssetDetailModal({ assetId, onClose }: Props) {
  const { state, locale, t } = useGame();
  const navigate = useNavigate();

  if (!assetId) return null;

  const def: AssetDefinition = state.assetCatalog[assetId];
  const asset: AssetState = state.assets[assetId];
  const position: Position | undefined = state.portfolio[assetId];

  if (!def || !asset) return null;

  const history = asset.priceHistory ?? [asset.price];
  const chartData = history.map((price, i) => ({ i, price }));
  const minPrice = Math.min(...history);
  const maxPrice = Math.max(...history);
  const priceChange = history.length > 1 ? (history[history.length - 1] - history[0]) / history[0] : 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const isUp = priceChange >= 0;

  return (
    <Dialog open={!!assetId} onOpenChange={() => onClose()}>
      <DialogContent className="terminal-card border-border max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="font-mono text-base flex items-center gap-2">
            <span className="text-primary">{assetId}</span>
            <span className="text-sm text-muted-foreground font-normal">{assetName(def)}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {locale === 'pt-BR' ? 'Detalhes do ativo' : 'Asset details'}
          </DialogDescription>
        </DialogHeader>

        {/* Price chart */}
        <div className="px-4">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-lg font-mono font-semibold text-foreground">
              {formatCurrency(asset.price)}
            </span>
            <span className={`text-xs font-mono ${isUp ? 'price-up' : 'price-down'}`}>
              {formatPct(priceChange)} ({history.length}d)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`assetGrad-${assetId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isUp ? 'hsl(140, 70%, 50%)' : 'hsl(0, 72%, 55%)'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isUp ? 'hsl(140, 70%, 50%)' : 'hsl(0, 72%, 55%)'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
              <XAxis dataKey="i" hide />
              <YAxis domain={[minPrice * 0.995, maxPrice * 1.005]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
                formatter={(v: number) => [formatCurrency(v), locale === 'pt-BR' ? 'Preço' : 'Price']}
                labelFormatter={() => ''}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isUp ? 'hsl(140, 70%, 50%)' : 'hsl(0, 72%, 55%)'}
                fill={`url(#assetGrad-${assetId})`}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-4 text-xs font-mono">
          <InfoRow label={locale === 'pt-BR' ? 'Classe' : 'Class'} value={t(`class.${def.class}`)} />
          <InfoRow label={locale === 'pt-BR' ? 'Setor' : 'Sector'} value={t(`sector.${def.sector}`)} />
          <InfoRow label={locale === 'pt-BR' ? 'Liquidez' : 'Liquidity'} value={def.liquidityRule} />
          <InfoRow label={locale === 'pt-BR' ? 'Correlação' : 'Correlation'} value={t(`group.${def.corrGroup}`)} />
          {def.dividendYieldAnnual != null && (
            <InfoRow label="Div. Yield" value={formatPct(def.dividendYieldAnnual)} className="price-up" />
          )}
          {def.creditRating && (
            <InfoRow label="Rating" value={def.creditRating} />
          )}
          {position && (
            <>
              <InfoRow label={locale === 'pt-BR' ? 'Posição' : 'Position'} value={String(position.quantity)} />
              <InfoRow
                label="P&L"
                value={formatCurrency((asset.price - position.avgPrice) * position.quantity)}
                className={(asset.price - position.avgPrice) >= 0 ? 'price-up' : 'price-down'}
              />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-0">
          <Button
            size="sm"
            className="flex-1 font-mono text-xs"
            onClick={() => { onClose(); navigate(`/trade?asset=${assetId}`); }}
          >
            {locale === 'pt-BR' ? 'Negociar' : 'Trade'}
          </Button>
          <Button variant="secondary" size="sm" className="font-mono text-xs" onClick={onClose}>
            {locale === 'pt-BR' ? 'Fechar' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={className ?? 'text-foreground'}>{value}</span>
    </div>
  );
}
