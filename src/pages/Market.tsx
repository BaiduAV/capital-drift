import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart } from 'lucide-react';
import AssetDetailModal from '@/components/game/AssetDetailModal';
import type { AssetClass } from '@/engine/types';

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
  const [tab, setTab] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const navigate = useNavigate();

  const formatPrice = (v: number) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const formatPct = (v: number) => (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';

  const activeTab = CLASS_TABS.find(t => t.key === tab)!;
  const assets = Object.entries(state.assetCatalog)
    .filter(([, def]) => activeTab.classes.length === 0 || activeTab.classes.includes(def.class))
    .map(([id, def]) => ({
      id,
      def,
      assetState: state.assets[id],
      position: state.portfolio[id],
    }));

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted flex-wrap h-auto gap-1">
          {CLASS_TABS.map(ct => (
            <TabsTrigger key={ct.key} value={ct.key} className="text-xs font-mono">
              {locale === 'pt-BR' ? ct.labelPt : ct.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="terminal-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{locale === 'pt-BR' ? 'Ativo' : 'Asset'}</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Preço' : 'Price'}</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Variação' : 'Change'}</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">{locale === 'pt-BR' ? 'Classe' : 'Class'}</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">{locale === 'pt-BR' ? 'Setor' : 'Sector'}</TableHead>
                  <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Posição' : 'Position'}</TableHead>
                  <TableHead className="text-xs text-center w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(({ id, def, assetState, position }) => {
                  const halted = assetState.haltedUntilDay && state.dayIndex < assetState.haltedUntilDay;
                  return (
                    <TableRow
                      key={id}
                      className={`${halted ? 'opacity-50' : ''} cursor-pointer hover:bg-muted/50`}
                      onClick={() => setSelectedAsset(id)}
                    >
                      <TableCell className="text-xs font-mono font-medium">
                        <span className="text-foreground">{id}</span>
                        <span className="text-muted-foreground ml-2 hidden sm:inline">{t(def.nameKey)}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-right">{formatPrice(assetState.price)}</TableCell>
                      <TableCell className={`text-xs font-mono text-right ${assetState.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                        {formatPct(assetState.lastReturn)}
                        {halted && <span className="ml-1 text-accent">⏸</span>}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground hidden sm:table-cell">{def.class}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground hidden md:table-cell">{def.sector}</TableCell>
                      <TableCell className="text-xs font-mono text-right">
                        {position ? position.quantity : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/trade?asset=${id}`); }}
                          disabled={!!halted}
                          aria-label={locale === 'pt-BR' ? `Comprar ${id}` : `Buy ${id}`}
                        >
                          <ShoppingCart className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AssetDetailModal assetId={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
