import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShoppingCart } from 'lucide-react';
import AssetDetailModal from '@/components/game/AssetDetailModal';
import type { AssetClass } from '@/engine/types';

import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataTable } from '@/components/ui/DataTable';

const CLASS_TABS: { key: string; classes: AssetClass[]; labelPt: string; labelEn: string }[] = [
  { key: 'all', classes: [], labelPt: 'Todos', labelEn: 'All' },
  { key: 'rf', classes: ['RF_POS', 'RF_PRE', 'RF_IPCA', 'DEBENTURE'], labelPt: 'Renda Fixa', labelEn: 'Fixed Income' },
  { key: 'stocks', classes: ['STOCK'], labelPt: 'Ações', labelEn: 'Stocks' },
  { key: 'etf', classes: ['ETF'], labelPt: 'ETFs', labelEn: 'ETFs' },
  { key: 'fii', classes: ['FII'], labelPt: 'FIIs', labelEn: 'REITs' },
  { key: 'crypto', classes: ['CRYPTO_MAJOR', 'CRYPTO_ALT'], labelPt: 'Cripto', labelEn: 'Crypto' },
];

export default function Market() {
  const { state, locale, t } = useGame();
  const [viewTab, setViewTab] = useState('overview'); // overview, screener
  const [classFilter, setClassFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const navigate = useNavigate();

  const formatPrice = (v: number) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const assetsList = useMemo(() => {
    return Object.entries(state.assetCatalog).map(([id, def]) => ({
      id,
      def,
      assetState: state.assets[id]!,
      position: state.portfolio[id],
    }));
  }, [state.assetCatalog, state.assets, state.portfolio]);

  const activeTabClasses = CLASS_TABS.find(t => t.key === classFilter)?.classes || [];
  const filteredAssets = useMemo(() => {
    return assetsList.filter(a => activeTabClasses.length === 0 || activeTabClasses.includes(a.def.class));
  }, [assetsList, activeTabClasses]);

  // Heatmap grouping
  const heatmapGroups = useMemo(() => {
    const groups: Record<string, typeof assetsList> = {};
    for (const a of assetsList) {
      // Group by corrGroup if it exists, otherwise fallback to class
      const g = (a.def as any).corrGroup || a.def.class;
      if (!groups[g]) groups[g] = [];
      groups[g].push(a);
    }
    return groups;
  }, [assetsList]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={locale === 'pt-BR' ? 'Mercados' : 'Markets'}
        subtitle={locale === 'pt-BR' ? 'Acompanhe tendências e descubra novos ativos.' : 'Track trends and discover new assets.'}
      >
        <Tabs value={viewTab} onValueChange={setViewTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="overview" className="text-xs font-mono">
              {locale === 'pt-BR' ? 'Visão Geral' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="screener" className="text-xs font-mono">
              {locale === 'pt-BR' ? 'Lista (Screener)' : 'Screener'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      {/* Visão Geral: Heatmap */}
      {viewTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {Object.entries(heatmapGroups).map(([groupName, groupAssets]) => (
            <SectionCard key={groupName} title={t(`group.${groupName}`)} className="bg-transparent border-none shadow-none" contentClassName="p-0">
              <div className="flex flex-wrap gap-2">
                {groupAssets
                  .sort((a, b) => b.assetState.lastReturn - a.assetState.lastReturn)
                  .map(a => {
                    const ret = a.assetState.lastReturn;
                    const halted = a.assetState.haltedUntilDay && state.dayIndex < a.assetState.haltedUntilDay;
                    const colorClass = ret > 0.05 ? 'bg-[hsl(var(--terminal-green))]/40 border-[hsl(var(--terminal-green))]' :
                      ret > 0 ? 'bg-[hsl(var(--terminal-green))]/10 border-[hsl(var(--terminal-green))]/50' :
                        ret < -0.05 ? 'bg-[hsl(var(--terminal-red))]/40 border-[hsl(var(--terminal-red))]' :
                          ret < 0 ? 'bg-[hsl(var(--terminal-red))]/10 border-[hsl(var(--terminal-red))]/50' :
                            'bg-muted/30 border-border/50';
                    return (
                      <div
                        key={a.id}
                        className={`w-24 p-2 rounded-md border text-center cursor-pointer transition-colors hover:brightness-110 ${colorClass} ${halted ? 'opacity-50' : ''}`}
                        onClick={() => setSelectedAsset(a.id)}
                      >
                        <div className="text-xs font-mono font-bold text-foreground truncate">{a.id}</div>
                        <div className="text-[10px] font-mono text-foreground/80 mt-1">{formatPrice(a.assetState.price)}</div>
                        <div className="text-[10px] font-mono font-semibold mt-0.5">{formatPct(ret)}</div>
                      </div>
                    );
                  })}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Screener: Tabela */}
      {viewTab === 'screener' && (
        <div className="space-y-4">
          <SectionCard
            title={locale === 'pt-BR' ? 'Mercado' : 'Market'}
            action={
              <div className="flex gap-2">
                {CLASS_TABS.map(tab => (
                  <Button
                    key={tab.key}
                    variant={classFilter === tab.key ? 'default' : 'secondary'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setClassFilter(tab.key)}
                  >
                    {locale === 'pt-BR' ? tab.labelPt : tab.labelEn}
                  </Button>
                ))}
              </div>
            }
          >
            <DataTable
              data={filteredAssets.sort((a, b) => b.assetState.lastReturn - a.assetState.lastReturn)}
              keyExtractor={a => a.id}
              onRowClick={a => setSelectedAsset(a.id)}
              emptyMessage={locale === 'pt-BR' ? 'Nenhum ativo encontrado.' : 'No assets found.'}
              columns={[
                {
                  key: 'asset',
                  header: locale === 'pt-BR' ? 'Ativo' : 'Asset',
                  render: (a) => (
                    <div>
                      <span className="text-foreground font-semibold font-mono">{a.id}</span>
                      <span className="text-muted-foreground ml-2 hidden sm:inline text-xs">{t(a.def.nameKey)}</span>
                      {a.assetState.haltedUntilDay && state.dayIndex < a.assetState.haltedUntilDay && (
                        <span className="ml-2 text-xs text-accent">⏸</span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'price',
                  header: locale === 'pt-BR' ? 'Preço' : 'Price',
                  align: 'right',
                  render: (a) => <span className="font-mono text-xs text-muted-foreground">{formatPrice(a.assetState.price)}</span>
                },
                {
                  key: 'change',
                  header: locale === 'pt-BR' ? 'Variação' : 'Change',
                  align: 'right',
                  render: (a) => (
                    <span className={`font-mono text-xs font-bold ${a.assetState.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                      {formatPct(a.assetState.lastReturn)}
                    </span>
                  )
                },
                {
                  key: 'class',
                  header: locale === 'pt-BR' ? 'Classe' : 'Class',
                  className: 'hidden md:table-cell',
                  render: (a) => <span className="text-[10px] text-muted-foreground">{a.def.class}</span>
                },
                {
                  key: 'sector',
                  header: locale === 'pt-BR' ? 'Setor' : 'Sector',
                  className: 'hidden lg:table-cell',
                  render: (a) => <span className="text-[10px] text-muted-foreground">{a.def.sector}</span>
                },
                {
                  key: 'action',
                  header: '',
                  align: 'right',
                  className: 'w-12',
                  render: (a) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"
                      onClick={(e) => { e.stopPropagation(); navigate(`/trade?asset=${a.id}`); }}
                      disabled={!!(a.assetState.haltedUntilDay && state.dayIndex < a.assetState.haltedUntilDay)}
                    >
                      <ShoppingCart className="h-3 w-3" />
                    </Button>
                  )
                }
              ]}
            />
          </SectionCard>
        </div>
      )}

      <AssetDetailModal assetId={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
