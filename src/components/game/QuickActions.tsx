import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Scale, Flame } from 'lucide-react';
import { toast } from 'sonner';

type Strategy = 'defensive' | 'balanced' | 'aggressive';

export default function QuickActions() {
  const { state, batchTrades, locale } = useGame();
  const [pending, setPending] = useState<Strategy | null>(null);

  const executeStrategy = (strategy: Strategy) => {
    batchTrades(({ buy, sell, getState }) => {
      const catalog = state.assetCatalog;
      const rfAssets = Object.keys(catalog).filter(id => catalog[id].corrGroup === 'FIXED_INCOME');
      const eqAssets = Object.keys(catalog).filter(id => catalog[id].corrGroup === 'EQUITY');
      const crAssets = Object.keys(catalog).filter(id => catalog[id].corrGroup === 'CRYPTO');

      if (strategy === 'defensive') {
        for (const id of [...eqAssets, ...crAssets]) {
          const pos = getState().portfolio[id];
          if (pos && pos.quantity > 0) sell(id, pos.quantity);
        }
        const s = getState();
        const price = s.assets['TSELIC']?.price ?? 100;
        const qty = Math.floor((s.cash * 0.9) / price);
        if (qty > 0) buy('TSELIC', qty);
      } else if (strategy === 'aggressive') {
        for (const id of rfAssets) {
          const pos = getState().portfolio[id];
          if (pos && pos.quantity > 0) sell(id, pos.quantity);
        }
        const s = getState();
        const targets = ['BOVA11', 'BTC'];
        const perTarget = s.cash * 0.9 / targets.length;
        for (const id of targets) {
          const price = s.assets[id]?.price ?? 50;
          const qty = Math.floor(perTarget / price);
          if (qty > 0) buy(id, qty);
        }
      } else {
        // Balanced: sell everything, redistribute
        for (const id of Object.keys(catalog)) {
          const pos = getState().portfolio[id];
          if (pos && pos.quantity > 0) sell(id, pos.quantity);
        }
        const s = getState();
        const targets = ['TSELIC', 'ETFTOT', 'FIITIJ', 'CRBTC'];
        const perTarget = s.cash * 0.9 / targets.length;
        for (const id of targets) {
          const price = s.assets[id]?.price ?? 50;
          const qty = Math.floor(perTarget / price);
          if (qty > 0) buy(id, qty);
        }
      }
    });

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
