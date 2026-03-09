import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Search, ShoppingCart, TrendingUp, TrendingDown, Landmark, Clock, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { TradeQuote, AssetClass } from '@/engine/types';
import { assetName } from '@/engine/i18n';
import { useIsMobile } from '@/hooks/use-mobile';

import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPIChip } from '@/components/ui/KPIChip';
import { Sparkline } from '@/components/ui/Sparkline';
import ContextualTip from '@/components/game/ContextualTip';

type ClassFilter = 'ALL' | 'STOCK' | 'FII' | 'ETF' | 'RF' | 'CRYPTO' | 'FX';

const CLASS_FILTER_MAP: Record<ClassFilter, AssetClass[] | null> = {
  ALL: null,
  STOCK: ['STOCK'],
  FII: ['FII'],
  ETF: ['ETF'],
  RF: ['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE'],
  CRYPTO: ['CRYPTO_MAJOR', 'CRYPTO_ALT'],
  FX: ['FX'],
};

export default function Trade() {
  const { state, locale, buy, sell, getBuyQuote, getSellQuote, reserveIPO, t } = useGame();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [assetId, setAssetId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<ClassFilter>('ALL');
  const [showConfirm, setShowConfirm] = useState(false);
  const [flashId, setFlashId] = useState<{ id: string; side: 'buy' | 'sell' } | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const paramAsset = searchParams.get('asset');
    if (paramAsset && state.assetCatalog[paramAsset]) {
      setAssetId(paramAsset);
      if (isMobile) setMobileDrawerOpen(true);
    }
  }, [searchParams, state.assetCatalog, isMobile]);

  const qty = parseInt(quantity) || 0;

  const selectedDef = assetId ? state.assetCatalog[assetId] : null;
  const selectedAsset = assetId ? state.assets[assetId] : null;
  const position = assetId ? state.portfolio[assetId] : null;

  const liveQuote: TradeQuote | null = useMemo(() => {
    if (!assetId || qty <= 0) return null;
    return side === 'buy' ? getBuyQuote(assetId, qty) : getSellQuote(assetId, qty);
  }, [assetId, qty, side, getBuyQuote, getSellQuote]);

  const maxBuyQty = useMemo(() => {
    if (!selectedAsset || !selectedDef) return 0;
    let lo = 0, hi = Math.floor(state.cash / (selectedAsset.price * 0.5));
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
      .filter(a => {
        if (searchQuery && !a.id.toLowerCase().includes(searchQuery.toLowerCase()) && !assetName(a.def).toLowerCase().includes(searchQuery.toLowerCase())) return false;
        const allowed = CLASS_FILTER_MAP[classFilter];
        if (allowed && !allowed.includes(a.def.class)) return false;
        return true;
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
    [state.assetCatalog, state.assets, state.portfolio, searchQuery, classFilter]
  );

  const bookbuildingIPOs = useMemo(() =>
    (state.ipoPipeline ?? []).filter(e => e.status === 'bookbuilding'),
    [state.ipoPipeline]
  );

  const [ipoReserveQty, setIpoReserveQty] = useState<Record<string, string>>({});

  const handleExecute = useCallback(() => {
    if (!assetId || qty <= 0) return;
    const result = side === 'buy' ? buy(assetId, qty) : sell(assetId, qty);
    if (result.success) {
      const newEquity = Object.entries(state.portfolio).reduce((sum, [id, pos]) => sum + pos.quantity * state.assets[id].price, 0) + state.cash;
      toast.success(
        locale === 'pt-BR'
          ? `${side === 'buy' ? 'Compra' : 'Venda'} de ${qty}× ${assetId} executada! Patrimônio: ${formatCompact(newEquity)}`
          : `${side === 'buy' ? 'Bought' : 'Sold'} ${qty}× ${assetId}! Equity: ${formatCompact(newEquity)}`
      );
      setFlashId({ id: assetId, side });
      setTimeout(() => setFlashId(null), 1500);
      setQuantity('');
      if (isMobile) setMobileDrawerOpen(false);
    } else {
      toast.error(result.quote.reason ? t(result.quote.reason) : 'Trade failed');
    }
  }, [assetId, qty, side, buy, sell, locale, t, isMobile, state.portfolio, state.assets, state.cash, formatCompact]);

  const handleTradeClick = () => {
    if (liveQuote && liveQuote.canExecute) {
      setShowConfirm(true);
    }
  };

  const setMaxQuantity = () => {
    if (side === 'buy') setQuantity(String(maxBuyQty));
    else if (position) setQuantity(String(position.quantity));
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
  const formatCompact = (v: number) =>
    Math.abs(v) >= 1_000_000
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 2 }).format(v)
      : formatCurrency(v);
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

  const selectAsset = (id: string) => {
    setAssetId(id);
    setQuantity('');
    if (isMobile) setMobileDrawerOpen(true);
  };

  // Mini chart data for selected asset
  const miniChartData = useMemo(() => {
    if (!selectedAsset) return [];
    return (selectedAsset.priceHistory ?? []).slice(-30).map((p, i) => ({ i, p }));
  }, [selectedAsset]);

  // ── Order Ticket (shared between desktop panel and mobile drawer) ──
  const orderTicketContent = (
    <>
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
          <div className="bg-muted/30 rounded-md px-3 py-2">
            <div className="flex items-center justify-between">
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
            {/* Mini chart */}
            {miniChartData.length > 2 && (
              <div className="mt-2 -mx-1">
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={miniChartData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                    <defs>
                      <linearGradient id="miniChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={selectedAsset.lastReturn >= 0 ? 'hsl(var(--terminal-green))' : 'hsl(var(--terminal-red))'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={selectedAsset.lastReturn >= 0 ? 'hsl(var(--terminal-green))' : 'hsl(var(--terminal-red))'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="p"
                      stroke={selectedAsset.lastReturn >= 0 ? 'hsl(var(--terminal-green))' : 'hsl(var(--terminal-red))'}
                      fill="url(#miniChartGrad)"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Position P&L in ticket */}
          {position && (
            <div className="bg-muted/20 rounded-md px-3 py-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Posição' : 'Position'}</span>
                <span className="text-foreground font-semibold">{position.quantity}</span>
              </div>
              {(() => {
                const pnl = (selectedAsset.price - position.avgPrice) * position.quantity;
                const pnlPct = (selectedAsset.price / position.avgPrice - 1);
                return (
                  <div className="flex justify-between mt-0.5">
                    <span className="text-muted-foreground">P&L</span>
                    <span className={pnl >= 0 ? 'price-up' : 'price-down'}>
                      {formatCurrency(pnl)} ({formatPct(pnlPct)})
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

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
            onClick={handleTradeClick}
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
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={locale === 'pt-BR' ? 'Negociação' : 'Trading'}
        subtitle={locale === 'pt-BR' ? 'Compre e venda ativos.' : 'Buy and sell assets.'}
      >
        <KPIChip label={locale === 'pt-BR' ? 'Caixa' : 'Cash'} value={formatCompact(state.cash)} />
      </PageHeader>

      <ContextualTip
        id="trade-quick-qty"
        message={locale === 'pt-BR' ? '💡 Use os botões 25%, 50%, 75%, MAX para definir quantidade rapidamente.' : '💡 Use the 25%, 50%, 75%, MAX buttons to set quantity quickly.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Asset List */}
        <div className="lg:col-span-3 space-y-3">
          {/* IPO Bookbuilding Section */}
          {bookbuildingIPOs.length > 0 && (
            <SectionCard title={locale === 'pt-BR' ? '🏦 IPOs em Bookbuilding' : '🏦 IPOs in Bookbuilding'}>
              <div className="space-y-3">
                {bookbuildingIPOs.map((ipo) => {
                  const rqty = parseInt(ipoReserveQty[ipo.ticker] || '0') || 0;
                  const maxQty = Math.floor(state.cash / ipo.offerPrice);
                  const daysLeft = ipo.listingDay - state.dayIndex;
                  return (
                    <div key={ipo.ticker} className="bg-muted/30 rounded-md px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-accent shrink-0" />
                            <div>
                              <div className="text-sm font-mono font-bold text-foreground">{ipo.ticker}</div>
                              <div className="text-[10px] text-muted-foreground">{ipo.displayName}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {t(`sector.${ipo.sector}`)}
                          </Badge>
                          <Badge variant={daysLeft <= 1 ? 'default' : 'secondary'} className="text-[10px] font-mono gap-1">
                            <Clock className="h-3 w-3" />
                            {daysLeft}d
                          </Badge>
                        </div>
                      </div>
                      {/* Demand bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                          <span>{locale === 'pt-BR' ? 'Demanda' : 'Demand'}</span>
                          <span className="text-foreground font-semibold">{(ipo.demand * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={ipo.demand * 100} className="h-1.5" />
                      </div>
                      {/* Price + reserve */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-mono">
                          <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Oferta' : 'Offer'}: </span>
                          <span className="text-foreground font-semibold">{formatCurrency(ipo.offerPrice)}</span>
                        </div>
                        {ipo.playerReservation > 0 ? (
                          <div className="text-[10px] text-primary font-mono font-semibold">
                            ✓ {locale === 'pt-BR' ? 'Reservado' : 'Reserved'}: {ipo.playerReservation}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={1}
                              max={maxQty}
                              value={ipoReserveQty[ipo.ticker] || ''}
                              onChange={e => setIpoReserveQty(prev => ({ ...prev, [ipo.ticker]: e.target.value }))}
                              className="w-20 h-7 text-[10px] font-mono text-center"
                              placeholder={String(Math.min(10, maxQty))}
                            />
                            <Button
                              size="sm"
                              className="h-7 text-[10px] font-mono"
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Asset list with filter tabs */}
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
            {/* Filter tabs */}
            <div className="px-3 pt-2 pb-1">
              <Tabs value={classFilter} onValueChange={v => setClassFilter(v as ClassFilter)}>
                <TabsList className="h-7 bg-muted/40 w-full justify-start overflow-x-auto">
                  {(['ALL', 'STOCK', 'FII', 'ETF', 'RF', 'CRYPTO', 'FX'] as ClassFilter[]).map(f => (
                    <TabsTrigger key={f} value={f} className="text-[10px] font-mono h-5 px-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                      {f === 'ALL' ? (locale === 'pt-BR' ? 'Todos' : 'All') : f}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="max-h-[500px] overflow-auto scrollbar-terminal divide-y divide-border/30">
              {sortedAssets.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {locale === 'pt-BR' ? 'Nenhum ativo encontrado.' : 'No assets found.'}
                </div>
              )}
              {sortedAssets.map(a => {
                const isSelected = a.id === assetId;
                const halted = a.assetState.haltedUntilDay && state.dayIndex < a.assetState.haltedUntilDay;
                const isFlashing = flashId?.id === a.id;
                const history = a.assetState.priceHistory ?? [];

                // P&L calculation
                let pnl: number | null = null;
                let pnlPct: number | null = null;
                if (a.position && a.position.avgPrice > 0) {
                  pnl = (a.assetState.price - a.position.avgPrice) * a.position.quantity;
                  pnlPct = a.assetState.price / a.position.avgPrice - 1;
                }

                return (
                  <div
                    key={a.id}
                    onClick={() => { if (!halted) selectAsset(a.id); }}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/40 border-l-2 border-transparent'}
                      ${halted ? 'opacity-40 cursor-not-allowed' : ''}
                      ${isFlashing ? (flashId.side === 'buy' ? 'trade-flash-buy' : 'trade-flash-sell') : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-mono font-bold text-foreground">{a.id}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{assetName(a.def)}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Sparkline */}
                      {history.length >= 5 && (
                        <Sparkline data={history.slice(-20)} width={50} height={24} />
                      )}
                      <div className="text-right min-w-[70px]">
                        <div className="text-xs font-mono text-foreground">{formatCurrency(a.assetState.price)}</div>
                        <div className={`text-[10px] font-mono font-semibold ${a.assetState.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                          {formatPct(a.assetState.lastReturn)}
                        </div>
                      </div>
                      {/* Position with P&L */}
                      {a.position && (
                        <div className="text-right pl-2 border-l border-border/30 min-w-[65px]">
                          <div className="text-xs font-mono font-semibold">{a.position.quantity}</div>
                          {pnl !== null && pnlPct !== null && (
                            <div className={`text-[10px] font-mono font-semibold ${pnl >= 0 ? 'price-up' : 'price-down'}`}>
                              {formatPct(pnlPct)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Right: Order Ticket (desktop only) */}
        {!isMobile && (
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-4 space-y-3">
              <SectionCard title={locale === 'pt-BR' ? 'Ordem' : 'Order'}>
                {orderTicketContent}
              </SectionCard>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: FAB when asset selected */}
      {isMobile && assetId && !mobileDrawerOpen && (
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label={locale === 'pt-BR' ? 'Abrir ordem' : 'Open order'}
        >
          <ShoppingCart className="h-6 w-6" />
        </button>
      )}

      {/* Mobile drawer for order ticket */}
      {isMobile && (
        <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="flex items-center justify-between pb-2">
              <DrawerTitle className="font-mono text-sm">{locale === 'pt-BR' ? 'Ordem' : 'Order'}</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-auto scrollbar-terminal">
              {orderTicketContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">
              {side === 'buy'
                ? (locale === 'pt-BR' ? 'Confirmar Compra' : 'Confirm Purchase')
                : (locale === 'pt-BR' ? 'Confirmar Venda' : 'Confirm Sale')
              }
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Ativo' : 'Asset'}</span>
                  <span className="font-semibold text-foreground">{assetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Lado' : 'Side'}</span>
                  <span className={side === 'buy' ? 'price-up' : 'price-down'}>
                    {side === 'buy' ? (locale === 'pt-BR' ? 'Compra' : 'Buy') : (locale === 'pt-BR' ? 'Venda' : 'Sell')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Quantidade' : 'Quantity'}</span>
                  <span className="text-foreground">{qty}</span>
                </div>
                {liveQuote && (
                  <>
                    <div className="border-t border-border/30 pt-2 flex justify-between font-semibold">
                      <span className="text-muted-foreground">{side === 'buy' ? (locale === 'pt-BR' ? 'Custo total' : 'Total cost') : (locale === 'pt-BR' ? 'Valor líquido' : 'Net proceeds')}</span>
                      <span className="text-foreground">{formatCurrency(liveQuote.totalCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locale === 'pt-BR' ? 'Caixa após' : 'Cash after'}</span>
                      <span className="text-foreground">
                        {formatCurrency(side === 'buy' ? state.cash - liveQuote.totalCost : state.cash + liveQuote.totalCost)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-xs">
              {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              className={`font-mono text-xs font-bold ${side === 'sell' ? 'bg-destructive hover:bg-destructive/80 text-destructive-foreground' : ''}`}
              onClick={() => { handleExecute(); setShowConfirm(false); }}
            >
              {side === 'buy' ? (locale === 'pt-BR' ? 'Confirmar Compra' : 'Confirm Buy') : (locale === 'pt-BR' ? 'Confirmar Venda' : 'Confirm Sell')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
