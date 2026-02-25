import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        <TabsList className="bg-muted">
          {CLASS_TABS.map(ct => (
            <TabsTrigger key={ct.key} value={ct.key} className="text-xs font-mono">
              {locale === 'pt-BR' ? ct.labelPt : ct.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="terminal-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{locale === 'pt-BR' ? 'Ativo' : 'Asset'}</TableHead>
                <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Preço' : 'Price'}</TableHead>
                <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Variação' : 'Change'}</TableHead>
                <TableHead className="text-xs">{locale === 'pt-BR' ? 'Classe' : 'Class'}</TableHead>
                <TableHead className="text-xs">{locale === 'pt-BR' ? 'Setor' : 'Sector'}</TableHead>
                <TableHead className="text-xs text-right">{locale === 'pt-BR' ? 'Posição' : 'Position'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(({ id, def, assetState, position }) => {
                const halted = assetState.haltedUntilDay && state.dayIndex < assetState.haltedUntilDay;
                return (
                  <TableRow key={id} className={halted ? 'opacity-50' : ''}>
                    <TableCell className="text-xs font-mono font-medium">
                      <span className="text-foreground">{id}</span>
                      <span className="text-muted-foreground ml-2">{t(def.nameKey)}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right">{formatPrice(assetState.price)}</TableCell>
                    <TableCell className={`text-xs font-mono text-right ${assetState.lastReturn >= 0 ? 'price-up' : 'price-down'}`}>
                      {formatPct(assetState.lastReturn)}
                      {halted && <span className="ml-1 text-terminal-amber">⏸</span>}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{def.class}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{def.sector}</TableCell>
                    <TableCell className="text-xs font-mono text-right">
                      {position ? position.quantity : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
