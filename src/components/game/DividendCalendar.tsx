import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { useNavigate } from 'react-router-dom';
import { SectionCard } from '@/components/ui/SectionCard';
import { Calendar, Coins } from 'lucide-react';
import { assetName } from '@/engine/i18n';

interface UpcomingDividend {
  assetId: string;
  name: string;
  daysUntil: number;
  estimatedYield: string;
  isOwned: boolean;
  estimatedAmount: number | null;
  assetClass: string;
}

export default function DividendCalendar() {
  const { state, locale } = useGame();
  const navigate = useNavigate();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);

  const upcoming = useMemo(() => {
    const items: UpcomingDividend[] = [];

    for (const [id, def] of Object.entries(state.assetCatalog)) {
      if (!def.dividendYieldAnnual || !def.dividendPeriodDays) continue;
      const asset = state.assets[id];
      if (!asset || asset.nextDividendDay == null) continue;

      const daysUntil = asset.nextDividendDay - state.dayIndex;
      if (daysUntil < 0 || daysUntil > 90) continue; // show up to 90 days ahead

      const pos = state.portfolio[id];
      const periodYield = def.dividendYieldAnnual * (def.dividendPeriodDays / 365);
      const estimatedAmount = pos && pos.quantity > 0
        ? pos.quantity * asset.price * periodYield
        : null;

      items.push({
        assetId: id,
        name: assetName(def),
        daysUntil,
        estimatedYield: (def.dividendYieldAnnual * 100).toFixed(1) + '% a.a.',
        isOwned: !!pos && pos.quantity > 0,
        estimatedAmount,
        assetClass: def.class,
      });
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [state]);

  const totalExpected = upcoming
    .filter(d => d.estimatedAmount != null)
    .reduce((sum, d) => sum + (d.estimatedAmount ?? 0), 0);

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          {locale === 'pt-BR' ? 'Calendário de Dividendos' : 'Dividend Calendar'}
        </span>
      }
      noPadding
      action={totalExpected > 0 ? (
        <span className="text-[10px] font-mono text-primary font-semibold flex items-center gap-1">
          <Coins className="h-3 w-3" />
          {formatCurrency(totalExpected)}
        </span>
      ) : undefined}
    >
      {upcoming.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          {locale === 'pt-BR' ? 'Nenhum dividendo previsto nos próximos 90 dias.' : 'No dividends expected in the next 90 days.'}
        </div>
      ) : (
        <div className="divide-y divide-border/30 max-h-[280px] overflow-auto scrollbar-terminal">
          {upcoming.map(d => (
            <div
              key={d.assetId}
              onClick={() => navigate(`/trade?asset=${d.assetId}`)}
              className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">{d.assetId}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                    d.assetClass === 'FII' ? 'bg-primary/15 text-primary' : 'bg-accent text-accent-foreground'
                  }`}>
                    {d.assetClass === 'FII' ? 'FII' : (locale === 'pt-BR' ? 'Ação' : 'Stock')}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{d.name}</div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className={`text-xs font-mono font-semibold ${
                  d.daysUntil <= 7 ? 'text-primary' : d.daysUntil <= 30 ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {d.daysUntil === 0
                    ? (locale === 'pt-BR' ? 'Hoje' : 'Today')
                    : d.daysUntil === 1
                      ? (locale === 'pt-BR' ? 'Amanhã' : 'Tomorrow')
                      : `${d.daysUntil}d`
                  }
                </div>
                {d.isOwned && d.estimatedAmount != null ? (
                  <div className="text-[10px] font-mono price-up">
                    +{formatCurrency(d.estimatedAmount)}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {d.estimatedYield}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
