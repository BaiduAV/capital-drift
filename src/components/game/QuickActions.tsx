import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Scale, Flame } from 'lucide-react';
import { toast } from 'sonner';

type Strategy = 'defensive' | 'balanced' | 'aggressive';

export default function QuickActions() {
  const { state, buy, sell, locale, equity } = useGame();
  const [pending, setPending] = useState<Strategy | null>(null);

  const rfAssets = Object.entries(state.assetCatalog).filter(([, d]) => d.corrGroup === 'FIXED_INCOME');
  const eqAssets = Object.entries(state.assetCatalog).filter(([, d]) => d.corrGroup === 'EQUITY');
  const crAssets = Object.entries(state.assetCatalog).filter(([, d]) => d.corrGroup === 'CRYPTO');

  const executeStrategy = (strategy: Strategy) => {
    let sold = 0;
    let bought = 0;

    if (strategy === 'defensive') {
      // Sell all equity + crypto positions
      for (const [id] of [...eqAssets, ...crAssets]) {
        const pos = state.portfolio[id];
        if (pos && pos.quantity > 0) {
          const r = sell(id, pos.quantity);
          if (r.success) sold++;
        }
      }
      // Buy RF_POS with available cash
      const tselic = state.assetCatalog['TSELIC'];
      if (tselic) {
        const price = state.assets['TSELIC']?.price ?? 100;
        const qty = Math.floor((state.cash * 0.9) / price);
        if (qty > 0) {
          const r = buy('TSELIC', qty);
          if (r.success) bought++;
        }
      }
    } else if (strategy === 'aggressive') {
      // Sell RF positions
      for (const [id] of rfAssets) {
        const pos = state.portfolio[id];
        if (pos && pos.quantity > 0) {
          const r = sell(id, pos.quantity);
          if (r.success) sold++;
        }
      }
      // Buy stocks/crypto equally
      const targets = ['ETFTOT', 'CRBTC'];
      const perTarget = state.cash * 0.9 / targets.length;
      for (const id of targets) {
        const price = state.assets[id]?.price ?? 50;
        const qty = Math.floor(perTarget / price);
        if (qty > 0) {
          const r = buy(id, qty);
          if (r.success) bought++;
        }
      }
    } else {
      // Balanced: sell everything, redistribute equally across classes
      for (const [id] of Object.entries(state.assetCatalog)) {
        const pos = state.portfolio[id];
        if (pos && pos.quantity > 0) {
          sell(id, pos.quantity);
        }
      }
      const targets = ['TSELIC', 'ETFTOT', 'FIITIJ', 'CRBTC'];
      const perTarget = state.cash * 0.9 / targets.length;
      for (const id of targets) {
        const price = state.assets[id]?.price ?? 50;
        const qty = Math.floor(perTarget / price);
        if (qty > 0) {
          const r = buy(id, qty);
          if (r.success) bought++;
        }
      }
    }

    const labels = {
      defensive: locale === 'pt-BR' ? 'Defensiva' : 'Defensive',
      balanced: locale === 'pt-BR' ? 'Balanceada' : 'Balanced',
      aggressive: locale === 'pt-BR' ? 'Agressiva' : 'Aggressive',
    };
    toast.success(
      locale === 'pt-BR'
        ? `Estratégia ${labels[strategy]} executada!`
        : `${labels[strategy]} strategy executed!`,
      { duration: 3000 }
    );
    setPending(null);
  };

  const handleClick = (strategy: Strategy) => {
    if (pending === strategy) {
      executeStrategy(strategy);
    } else {
      setPending(strategy);
      toast.info(
        locale === 'pt-BR'
          ? 'Clique novamente para confirmar.'
          : 'Click again to confirm.',
        { duration: 2000 }
      );
    }
  };

  return (
    <Card className="terminal-card">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-sans text-muted-foreground">
          {locale === 'pt-BR' ? 'Ação Rápida' : 'Quick Action'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex gap-2">
        <Button
          variant={pending === 'defensive' ? 'default' : 'secondary'}
          size="sm"
          className="flex-1 gap-1 text-[10px]"
          onClick={() => handleClick('defensive')}
        >
          <Shield className="h-3 w-3" />
          {locale === 'pt-BR' ? 'Defensivo' : 'Defensive'}
        </Button>
        <Button
          variant={pending === 'balanced' ? 'default' : 'secondary'}
          size="sm"
          className="flex-1 gap-1 text-[10px]"
          onClick={() => handleClick('balanced')}
        >
          <Scale className="h-3 w-3" />
          {locale === 'pt-BR' ? 'Balanceado' : 'Balanced'}
        </Button>
        <Button
          variant={pending === 'aggressive' ? 'default' : 'secondary'}
          size="sm"
          className="flex-1 gap-1 text-[10px]"
          onClick={() => handleClick('aggressive')}
        >
          <Flame className="h-3 w-3" />
          {locale === 'pt-BR' ? 'Agressivo' : 'Aggressive'}
        </Button>
      </CardContent>
    </Card>
  );
}
