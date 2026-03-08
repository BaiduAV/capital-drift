import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, ShoppingCart, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import type { TradeQuote, IPOPipelineEntry } from '@/engine/types';
import { assetName } from '@/engine/i18n';

import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPIChip } from '@/components/ui/KPIChip';

export default function Trade() {
  const { state, locale, buy, sell, getBuyQuote, getSellQuote, reserveIPO, t } = useGame();
  const [searchParams] = useSearchParams();

  const [assetId, setAssetId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const paramAsset = searchParams.get('asset');
    if (paramAsset && state.assetCatalog[paramAsset]) {
      setAssetId(paramAsset);
    }
  }, [searchParams, state.assetCatalog]);

  const qty = parseInt(quantity) || 0;

  const selectedDef = assetId ? state.assetCatalog[assetId] : null;
  const selectedAsset = assetId ? state.assets[assetId] : null;
  const position = assetId ? state.portfolio[assetId] : null;

  // Live quote - recalculates on every change
  const liveQuote: TradeQuote | null = useMemo(() => {
    if (!assetId || qty <= 0) return null;
    return side === 'buy' ? getBuyQuote(assetId, qty) : getSellQuote(assetId, qty);
  }, [assetId, qty, side, getBuyQuote, getSellQuote]);

  // Calculate max affordable quantity for buying
  const maxBuyQty = useMemo(() => {
    if (!selectedAsset || !selectedDef) return 0;
    // Binary search for max qty that can execute
    let lo = 0, hi = Math.floor(state.cash / (selectedAsset.price * 0.5)); // generous upper bound
    hi = Math.max(hi, 1);
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const q = getBuyQuote(assetId, mid);
      if (q.canExecute) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }, [assetId, selectedAsset, selectedDef, state.cash, getBuyQuote]);

  const sortedAssets = useMemo(() =>
    Object.entries(state.assetCatalog)
      .map(([id, def]) => ({ id, def, assetState: state.assets[id], position: state.portfolio[id] }))
      .filter(a => !searchQuery || a.id.toLowerCase().includes(searchQuery.toLowerCase()) || assetName(a.def).toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.id.localeCompare(b.id)),
    [state.assetCatalog, state.assets, state.portfolio, searchQuery]
  );

  // IPOs in bookbuilding
  const bookbuildingIPOs = useMemo(() =>
    (state.ipoPipeline ?? []).filter(e => e.status === 'bookbuilding'),
    [state.ipoPipeline]
  );

  const [ipoReserveQty, setIpoReserveQty] = useState<Record<string, string>>({});

  const handleExecute = () => {
    if (!assetId || qty <= 0) return;
    const result = side === 'buy' ? buy(assetId, qty) : sell(assetId, qty);
    if (result.success) {
      toast.success(
        locale === 'pt-BR'
          ? `${side === 'buy' ? 'Compra' : 'Venda'} de ${qty}× ${assetId} executada!`
          : `${side === 'buy' ? 'Bought' : 'Sold'} ${qty}× ${assetId}!`
      );
      setQuantity('');
    } else {
      toast.error(result.quote.reason ? t(result.quote.reason) : 'Trade failed');
    }
  };

  const setMaxQuantity = () => {
    if (side === 'buy') {
      setQuantity(String(maxBuyQty));
    } else if (position) {
      setQuantity(String(position.quantity));
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const quickQtyOptions = useMemo(() => {
    if (side === 'buy') {
      return [
        { label: '25%', qty: Math.floor(maxBuyQty * 0.25) },
        { label: '50%', qty: Math.floor(maxBuyQty * 0.5) },
        { label: '75%', qty: Math.floor(maxBuyQty * 0.75) },
        { label: 'MAX', qty: maxBuyQty },
      ];
    }
    const posQty = position?.quantity ?? 0;
    return [
      { label: '25%', qty: Math.floor(posQty * 0.25) },
      { label: '50%', qty: Math.floor(posQty * 0.5) },
      { label: '75%', qty: Math.floor(posQty * 0.75) },
      { label: 'MAX', qty: posQty },
    ];
  }, [side, maxBuyQty, position]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={locale === 'pt-BR' ? 'Negociação' : 'Trading'}
        subtitle={locale === 'pt-BR' ? 'Compre e venda ativos.' : 'Buy and sell assets.'}
      >
        <KPIChip label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCurrency(state.cash)} />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Asset Selector */}
        <div className="lg:col-span-3 space-y-3">
          {/* IPO Bookbuilding Section */}
          {bookbuildingIPOs.length > 0 && (
            <SectionCard title={locale === 'pt-BR' ? '📋 IPOs em Bookbuilding' : '📋 IPOs in Bookbuilding'}>
              <div className="space-y-3">
                {bookbuildingIPOs.map((ipo) => {
                  const rqty = parseInt(ipoReserveQty[ipo.ticker] || '0') || 0;
                  const maxQty = Math.floor(state.cash / ipo.offerPrice);
                  return (
                    <div key={ipo.ticker} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <div className="text-sm font-mono font-bold text-foreground">{ipo.ticker}</div>
                            <div className="text-[10px] text-muted-foreground">{ipo.displayName}</div>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                          <span>{t(`sector.${ipo.sector}`)}</span>
                          <span>R$ {ipo.offerPrice.toFixed(2)}</span>
                          <span>{locale === 'pt-BR' ? 'Demanda' : 'Demand'}: {(ipo.demand * 100).toFixed(0)}%</span>
                          <span>D{ipo.listingDay}</span>
                        </div>
                        {ipo.playerReservation > 0 && (
                          <div className="text-[10px] text-primary font-semibold mt-0.5">
                            ✓ {locale === 'pt-BR' ? 'Reservado' : 'Reserved'}: {ipo.playerReservation}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={ipoReserveQty[ipo.ticker] || ''}
                          onChange={e => setIpoReserveQty(prev => ({ ...prev, [ipo.ticker]: e.target.value }))}
                          className="w-20 h-8 text-xs font-mono text-center"
                          placeholder={String(Math.min(10, maxQty))}
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs font-mono"
                          disabled={rqty <= 0 || rqty > maxQty}
                          onClick={() => {
                            const success = reserveIPO(ipo.ticker, rqty);
                            if (success) {
                              toast.success(locale === 'pt-BR' ? `Reserva de ${rqty}× ${ipo.ticker} confirmada!` : `Reserved ${rqty}× ${ipo.ticker}!`);
                              setIpoReserveQty(prev => ({ ...prev, [ipo.ticker]: '' }));
                            } else {
                              toast.error(locale === 'pt-BR' ? 'Falha na reserva' : 'Reservation failed');
                            }
                          }}
                        >
                          {locale === 'pt-BR' ? 'Reservar' : 'Reserve'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
          <SectionCard
            title={locale === 'pt-BR' ? 'Ativos' : 'Assets'}
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
                    onClick={() => { if (!halted) { setAssetId(a.id); setQuantity(''); } }}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/40 border-l-2 border-transparent'}
                      ${halted ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-mono font-bold text-foreground">{a.id}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{assetName(a.def)}</div>
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
                          <div className="text-[10px] text-muted-foreground">pos</div>
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
            <SectionCard title={locale === 'pt-BR' ? 'Ordem' : 'Order'}>
              {/* Side toggle */}
              <div className="flex gap-1 mb-4 bg-muted/30 p-1 rounded-md">
                <Button
                  variant={side === 'buy' ? 'default' : 'ghost'}
                  size="sm"
                  className={`flex-1 text-xs font-mono font-bold gap-1.5 ${side === 'buy' ? '' : 'text-muted-foreground'}`}
                  onClick={() => { setSide('buy'); setQuantity(''); }}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {locale === 'pt-BR' ? 'COMPRAR' : 'BUY'}
                </Button>
                <Button
                  variant={side === 'sell' ? 'destructive' : 'ghost'}
                  size="sm"
                  className={`flex-1 text-xs font-mono font-bold gap-1.5 ${side === 'sell' ? '' : 'text-muted-foreground'}`}
                  onClick={() => { setSide('sell'); setQuantity(''); }}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  {locale === 'pt-BR' ? 'VENDER' : 'SELL'}
                </Button>
              </div>

              {selectedDef && selectedAsset ? (
                <div className="space-y-4">
                  {/* Selected asset header */}
                  <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                    <div>
                      <div className="text-sm font-mono font-bold text-foreground">{assetId}</div>
                      <div className="text-[10px] text-muted-foreground">{assetName(selectedDef)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-foreground">{formatCurrency(selectedAsset.price)}</div>
                      <div className={`text-[10px] font-mono ${selectedAsset.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                        {formatPct(selectedAsset.lastReturn)}
                      </div>
                    </div>
                  </div>

                  {/* Quantity input + quick buttons */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                      {locale === 'pt-BR' ? 'Quantidade' : 'Quantity'}
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuantity(String(Math.max(0, qty - 1)))}>
                        <span className="text-sm font-mono font-bold">−</span>
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="text-center text-sm font-mono h-9 flex-1"
                        placeholder="0"
                      />
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuantity(String(qty + 1))}>
                        <span className="text-sm font-mono font-bold">+</span>
                      </Button>
                    </div>

                    {/* Quick % buttons */}
                    <div className="flex gap-1 mt-2">
                      {quickQtyOptions.map(opt => (
                        <Button
                          key={opt.label}
                          variant="outline"
                          size="sm"
                          className={`flex-1 h-7 text-[10px] font-mono ${qty === opt.qty && opt.qty > 0 ? 'border-primary text-primary' : ''}`}
                          onClick={() => setQuantity(String(opt.qty))}
                          disabled={opt.qty <= 0}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>

                    {side === 'sell' && position && (
                      <div className="text-[10px] text-muted-foreground mt-1.5">
                        {locale === 'pt-BR' ? 'Em carteira' : 'In portfolio'}: <span className="font-semibold text-foreground">{position.quantity}</span>
                      </div>
                    )}
                    {side === 'buy' && maxBuyQty > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-1.5">
                        {locale === 'pt-BR' ? 'Máximo comprável' : 'Max affordable'}: <span className="font-semibold text-foreground">{maxBuyQty}</span>
                      </div>
                    )}
                  </div>

                  {/* Live cost preview */}
                  {liveQuote && (
                    <div className="bg-muted/20 rounded-md p-3 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Preço unit.' : 'Unit price'}</span>
                        <span className="text-foreground">{formatCurrency(liveQuote.unitPrice)}</span>
                      </div>
                      {liveQuote.spread > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Spread</span>
                          <span>{(liveQuote.spread * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {liveQuote.fees > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Taxas' : 'Fees'}</span>
                          <span>{formatCurrency(liveQuote.fees)}</span>
                        </div>
                      )}
                      <div className="border-t border-border/30 pt-1.5 flex justify-between font-semibold text-foreground">
                        <span>{side === 'buy' ? (locale === 'pt-BR' ? 'Custo total' : 'Total cost') : (locale === 'pt-BR' ? 'Valor líquido' : 'Net proceeds')}</span>
                        <span>{formatCurrency(liveQuote.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Caixa após' : 'Cash after'}</span>
                        <span className={
                          (side === 'buy' ? state.cash - liveQuote.totalCost : state.cash + liveQuote.totalCost) < 0
                            ? 'text-destructive' : 'text-foreground'
                        }>
                          {formatCurrency(side === 'buy' ? state.cash - liveQuote.totalCost : state.cash + liveQuote.totalCost)}
                        </span>
                      </div>
                      {!liveQuote.canExecute && liveQuote.reason && (
                        <div className="text-destructive text-[10px] mt-1">⚠ {t(liveQuote.reason)}</div>
                      )}
                    </div>
                  )}

                  {/* Execute button */}
                  <Button
                    size="default"
                    className={`w-full font-mono font-bold text-sm gap-2 ${side === 'sell' ? 'bg-destructive hover:bg-destructive/80 text-destructive-foreground' : ''}`}
                    onClick={handleExecute}
                    disabled={!liveQuote?.canExecute}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {side === 'buy'
                      ? (locale === 'pt-BR' ? `Comprar ${qty > 0 ? qty + '×' : ''}` : `Buy ${qty > 0 ? qty + '×' : ''}`)
                      : (locale === 'pt-BR' ? `Vender ${qty > 0 ? qty + '×' : ''}` : `Sell ${qty > 0 ? qty + '×' : ''}`)
                    }
                  </Button>

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
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {locale === 'pt-BR' ? 'Selecione um ativo para negociar.' : 'Select an asset to trade.'}
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
