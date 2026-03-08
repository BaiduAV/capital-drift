import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { TradeQuote } from '@/engine/types';
import { assetName } from '@/engine/i18n';

import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPIChip } from '@/components/ui/KPIChip';

export default function Trade() {
  const { state, locale, buy, sell, getBuyQuote, getSellQuote, t } = useGame();
  const [searchParams] = useSearchParams();

  const [assetId, setAssetId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [lastQuote, setLastQuote] = useState<TradeQuote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const paramAsset = searchParams.get('asset');
    if (paramAsset && state.assetCatalog[paramAsset]) {
      setAssetId(paramAsset);
      setLastQuote(null);
    }
  }, [searchParams, state.assetCatalog]);

  const qty = parseInt(quantity) || 0;

  const sortedAssets = useMemo(() =>
    Object.entries(state.assetCatalog)
      .map(([id, def]) => ({ id, def, assetState: state.assets[id], position: state.portfolio[id] }))
      .filter(a => !searchQuery || a.id.toLowerCase().includes(searchQuery.toLowerCase()) || assetName(a.def).toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.id.localeCompare(b.id)),
    [state.assetCatalog, state.assets, state.portfolio, searchQuery, t]
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
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const selectedDef = assetId ? state.assetCatalog[assetId] : null;
  const selectedAsset = assetId ? state.assets[assetId] : null;
  const position = assetId ? state.portfolio[assetId] : null;

  const previewCostTotal = selectedAsset ? qty * selectedAsset.price : 0;
  const cashAfterTrade = side === 'buy' ? state.cash - previewCostTotal : state.cash + previewCostTotal;

  return (
    <div className="space-y-4">
      <PageHeader
        title={locale === 'pt-BR' ? 'Negociação' : 'Trading'}
        subtitle={locale === 'pt-BR' ? 'Compre e venda ativos com preview em tempo real.' : 'Buy and sell assets with real-time preview.'}
      >
        <KPIChip label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCurrency(state.cash)} />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Asset Selector */}
        <div className="lg:col-span-3 space-y-3">
          <SectionCard
            title={locale === 'pt-BR' ? 'Selecione um Ativo' : 'Select an Asset'}
            noPadding
            action={
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={locale === 'pt-BR' ? 'Buscar...' : 'Search...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-7 pl-7 text-xs font-mono"
                />
              </div>
            }
          >
            <div className="max-h-[500px] overflow-auto scrollbar-terminal divide-y divide-border/30">
              {sortedAssets.map(a => {
                const isSelected = a.id === assetId;
                const halted = a.assetState.haltedUntilDay && state.dayIndex < a.assetState.haltedUntilDay;
                return (
                  <div
                    key={a.id}
                    onClick={() => { if (!halted) { setAssetId(a.id); setLastQuote(null); } }}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/40 border-l-2 border-transparent'}
                      ${halted ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <div className="text-sm font-mono font-bold text-foreground">{a.id}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{assetName(a.def)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono text-foreground">{formatCurrency(a.assetState.price)}</div>
                        <div className={`text-[10px] font-mono font-semibold ${a.assetState.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                          {formatPct(a.assetState.lastReturn)}
                        </div>
                      </div>
                      {a.position && (
                        <div className="text-right pl-2 border-l border-border/30">
                          <div className="text-[10px] text-muted-foreground">{locale === 'pt-BR' ? 'pos' : 'pos'}</div>
                          <div className="text-xs font-mono font-semibold">{a.position.quantity}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Right: Order Ticket */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-3">
            <SectionCard title={locale === 'pt-BR' ? 'Order Ticket' : 'Order Ticket'}>
              {/* Side toggle */}
              <div className="flex gap-1 mb-4">
                <Button
                  variant={side === 'buy' ? 'default' : 'secondary'}
                  size="sm"
                  className="flex-1 text-xs font-mono font-bold"
                  onClick={() => { setSide('buy'); setLastQuote(null); }}
                >
                  {locale === 'pt-BR' ? 'COMPRAR' : 'BUY'}
                </Button>
                <Button
                  variant={side === 'sell' ? 'destructive' : 'secondary'}
                  size="sm"
                  className="flex-1 text-xs font-mono font-bold"
                  onClick={() => { setSide('sell'); setLastQuote(null); }}
                >
                  {locale === 'pt-BR' ? 'VENDER' : 'SELL'}
                </Button>
              </div>

              {/* Selected Asset Info */}
              {selectedDef && selectedAsset ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                    <div>
                      <div className="text-sm font-mono font-bold text-foreground">{assetId}</div>
                      <div className="text-[10px] text-muted-foreground">{t(selectedDef.nameKey)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-foreground">{formatCurrency(selectedAsset.price)}</div>
                      <div className={`text-[10px] font-mono ${selectedAsset.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                        {formatPct(selectedAsset.lastReturn)}
                      </div>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold">{locale === 'pt-BR' ? 'Quantidade' : 'Quantity'}</label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setQuantity(String(Math.max(0, qty - 1)))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => { setQuantity(e.target.value); setLastQuote(null); }}
                        className="text-center text-sm font-mono h-8"
                        placeholder="0"
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setQuantity(String(qty + 1))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {side === 'sell' && position && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {locale === 'pt-BR' ? 'Disponível' : 'Available'}: {position.quantity}
                        <Button variant="link" className="h-auto p-0 ml-2 text-[10px]" onClick={() => setQuantity(String(position.quantity))}>Max</Button>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="bg-muted/20 rounded-md p-3 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Custo estimado' : 'Est. cost'}</span>
                      <span className="text-foreground">{formatCurrency(previewCostTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Caixa após' : 'Cash after'}</span>
                      <span className={cashAfterTrade < 0 ? 'text-[hsl(var(--terminal-red))]' : 'text-foreground'}>{formatCurrency(cashAfterTrade)}</span>
                    </div>
                    {lastQuote && (
                      <>
                        <div className="border-t border-border/30 my-1" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Spread</span>
                          <span>{(lastQuote.spread * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Taxas' : 'Fees'}</span>
                          <span>{formatCurrency(lastQuote.fees)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>Total</span>
                          <span>{formatCurrency(lastQuote.totalCost)}</span>
                        </div>
                        {!lastQuote.canExecute && lastQuote.reason && (
                          <div className="text-[hsl(var(--terminal-red))] mt-1">⚠ {t(lastQuote.reason)}</div>
                        )}
                        {lastQuote.canExecute && (
                          <div className="text-[hsl(var(--terminal-green))] mt-1">✓ {locale === 'pt-BR' ? 'Pode executar' : 'Can execute'}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1 text-xs font-mono" onClick={handleQuote} disabled={!assetId || qty <= 0}>
                      {locale === 'pt-BR' ? 'Cotação' : 'Quote'}
                    </Button>
                    <Button
                      size="sm"
                      className={`flex-1 text-xs font-mono font-bold ${side === 'sell' ? 'bg-destructive hover:bg-destructive/80' : ''}`}
                      onClick={handleExecute}
                      disabled={!assetId || qty <= 0}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                      {side === 'buy' ? (locale === 'pt-BR' ? 'Comprar' : 'Buy') : (locale === 'pt-BR' ? 'Vender' : 'Sell')}
                    </Button>
                  </div>

                  {/* Asset Info */}
                  <div className="border-t border-border/30 pt-3 space-y-1 text-xs font-mono">
                    <InfoRow label={locale === 'pt-BR' ? 'Classe' : 'Class'} value={t(`class.${selectedDef.class}`)} />
                    <InfoRow label={locale === 'pt-BR' ? 'Setor' : 'Sector'} value={t(`sector.${selectedDef.sector}`)} />
                    <InfoRow label={locale === 'pt-BR' ? 'Liquidez' : 'Liquidity'} value={selectedDef.liquidityRule} />
                    {selectedDef.creditRating && <InfoRow label="Rating" value={selectedDef.creditRating} />}
                    {selectedDef.dividendYieldAnnual != null && selectedDef.dividendYieldAnnual > 0 && (
                      <InfoRow label="Div. Yield" value={`${(selectedDef.dividendYieldAnnual * 100).toFixed(2)}% a.a.`} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {locale === 'pt-BR' ? 'Selecione um ativo à esquerda para começar.' : 'Select an asset on the left to begin.'}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
