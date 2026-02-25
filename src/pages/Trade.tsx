import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { TradeQuote } from '@/engine/types';

export default function Trade() {
  const { state, locale, buy, sell, getBuyQuote, getSellQuote, t } = useGame();
  const [searchParams] = useSearchParams();

  const [assetId, setAssetId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [lastQuote, setLastQuote] = useState<TradeQuote | null>(null);

  // Pre-select asset from URL params
  useEffect(() => {
    const paramAsset = searchParams.get('asset');
    if (paramAsset && state.assetCatalog[paramAsset]) {
      setAssetId(paramAsset);
      setLastQuote(null);
    }
  }, [searchParams, state.assetCatalog]);

  const qty = parseInt(quantity) || 0;

  const sortedAssets = useMemo(() =>
    Object.entries(state.assetCatalog).sort((a, b) => a[0].localeCompare(b[0])),
    [state.assetCatalog]
  );

  const handleQuote = () => {
    if (!assetId || qty <= 0) return;
    const q = side === 'buy' ? getBuyQuote(assetId, qty) : getSellQuote(assetId, qty);
    setLastQuote(q);
  };

  const handleExecute = () => {
    if (!assetId || qty <= 0) return;
    const result = side === 'buy' ? buy(assetId, qty) : sell(assetId, qty);
    if (result.success) {
      toast.success(
        locale === 'pt-BR'
          ? `${side === 'buy' ? 'Compra' : 'Venda'} de ${qty}x ${assetId} executada!`
          : `${side === 'buy' ? 'Bought' : 'Sold'} ${qty}x ${assetId}!`
      );
      setLastQuote(null);
      setQuantity('');
    } else {
      toast.error(result.quote.reason ? t(result.quote.reason) : 'Trade failed');
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);

  const selectedDef = assetId ? state.assetCatalog[assetId] : null;
  const selectedAsset = assetId ? state.assets[assetId] : null;
  const position = assetId ? state.portfolio[assetId] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Order form */}
      <Card className="terminal-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-sans">
            {locale === 'pt-BR' ? 'Nova Ordem' : 'New Order'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Side toggle */}
          <div className="flex gap-1">
            <Button
              variant={side === 'buy' ? 'default' : 'secondary'}
              size="sm"
              className="flex-1 text-xs font-mono"
              onClick={() => { setSide('buy'); setLastQuote(null); }}
            >
              {locale === 'pt-BR' ? 'COMPRAR' : 'BUY'}
            </Button>
            <Button
              variant={side === 'sell' ? 'destructive' : 'secondary'}
              size="sm"
              className="flex-1 text-xs font-mono"
              onClick={() => { setSide('sell'); setLastQuote(null); }}
            >
              {locale === 'pt-BR' ? 'VENDER' : 'SELL'}
            </Button>
          </div>

          {/* Asset select */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">{locale === 'pt-BR' ? 'Ativo' : 'Asset'}</label>
            <Select value={assetId} onValueChange={(v) => { setAssetId(v); setLastQuote(null); }}>
              <SelectTrigger className="text-xs font-mono">
                <SelectValue placeholder={locale === 'pt-BR' ? 'Selecione...' : 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {sortedAssets.map(([id, def]) => (
                  <SelectItem key={id} value={id} className="text-xs font-mono">
                    {id} — {t(def.nameKey)} ({state.assets[id].price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">{locale === 'pt-BR' ? 'Quantidade' : 'Quantity'}</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={e => { setQuantity(e.target.value); setLastQuote(null); }}
              className="text-xs font-mono"
              placeholder="0"
            />
            {side === 'sell' && position && (
              <span className="text-[10px] text-muted-foreground">
                {locale === 'pt-BR' ? 'Disponível' : 'Available'}: {position.quantity}
              </span>
            )}
          </div>

          {/* Info */}
          {selectedAsset && (
            <div className="text-xs font-mono space-y-0.5 text-muted-foreground">
              <div>{locale === 'pt-BR' ? 'Preço atual' : 'Current price'}: <span className="text-foreground">{selectedAsset.price.toFixed(2)}</span></div>
              <div>{locale === 'pt-BR' ? 'Caixa' : 'Cash'}: <span className="text-foreground">{formatCurrency(state.cash)}</span></div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 text-xs font-mono" onClick={handleQuote} disabled={!assetId || qty <= 0}>
              {locale === 'pt-BR' ? 'Cotação' : 'Quote'}
            </Button>
            <Button size="sm" className="flex-1 text-xs font-mono" onClick={handleExecute} disabled={!assetId || qty <= 0}>
              {locale === 'pt-BR' ? 'Executar' : 'Execute'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quote / Asset info */}
      <div className="space-y-4">
        {lastQuote && (
          <Card className="terminal-card">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-sans">{locale === 'pt-BR' ? 'Cotação' : 'Quote'}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 text-xs font-mono space-y-1">
              <Row label={locale === 'pt-BR' ? 'Preço unitário' : 'Unit price'} value={lastQuote.unitPrice.toFixed(4)} />
              <Row label="Spread" value={`${(lastQuote.spread * 100).toFixed(2)}%`} />
              <Row label={locale === 'pt-BR' ? 'Taxas' : 'Fees'} value={formatCurrency(lastQuote.fees)} />
              <Row label="Total" value={formatCurrency(lastQuote.totalCost)} highlight />
              {!lastQuote.canExecute && lastQuote.reason && (
                <div className="text-terminal-red mt-1">⚠ {t(lastQuote.reason)}</div>
              )}
              {lastQuote.canExecute && (
                <div className="text-terminal-green mt-1">✓ {locale === 'pt-BR' ? 'Pode executar' : 'Can execute'}</div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedDef && (
          <Card className="terminal-card">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-sans">{t(selectedDef.nameKey)}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 text-xs font-mono space-y-1">
              <Row label={locale === 'pt-BR' ? 'Classe' : 'Class'} value={selectedDef.class} />
              <Row label={locale === 'pt-BR' ? 'Setor' : 'Sector'} value={selectedDef.sector} />
              <Row label={locale === 'pt-BR' ? 'Liquidez' : 'Liquidity'} value={selectedDef.liquidityRule} />
              {selectedDef.creditRating && <Row label="Rating" value={selectedDef.creditRating} />}
              {selectedDef.dividendYieldAnnual != null && selectedDef.dividendYieldAnnual > 0 && (
                <Row label="Div. Yield" value={`${(selectedDef.dividendYieldAnnual * 100).toFixed(2)}% a.a.`} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'text-foreground font-semibold' : 'text-foreground'}>{value}</span>
    </div>
  );
}
