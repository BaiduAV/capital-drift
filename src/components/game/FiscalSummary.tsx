import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { SectionCard } from '@/components/ui/SectionCard';
import { Receipt, TrendingDown } from 'lucide-react';
import { createInitialTaxState, type TaxCategory } from '@/engine/taxes';

const CATEGORY_LABELS: Record<string, Record<TaxCategory, string>> = {
  'pt-BR': {
    FIXED_INCOME: 'Renda Fixa',
    STOCK: 'Ações',
    FII: 'FIIs',
    ETF: 'ETFs',
    CRYPTO: 'Crypto',
    FX: 'Câmbio',
  },
  en: {
    FIXED_INCOME: 'Fixed Income',
    STOCK: 'Stocks',
    FII: 'REITs',
    ETF: 'ETFs',
    CRYPTO: 'Crypto',
    FX: 'FX',
  },
};

export default function FiscalSummary() {
  const { state, locale, t } = useGame();
  const taxState = state.taxState ?? createInitialTaxState();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);

  const totalTaxPaid = taxState.totalIRPaid + taxState.totalIOFPaid;

  const lossEntries = useMemo(() => {
    return Object.entries(taxState.accumulatedLosses)
      .filter(([, v]) => (v ?? 0) < -0.01)
      .map(([cat, v]) => ({
        category: cat as TaxCategory,
        amount: v as number,
      }));
  }, [taxState.accumulatedLosses]);

  if (totalTaxPaid < 0.01 && lossEntries.length === 0) {
    return (
      <SectionCard title={t('tax.fiscal_summary')} className="opacity-70">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono py-2">
          <Receipt className="h-3.5 w-3.5" />
          {locale === 'pt-BR' ? 'Nenhum imposto pago ainda.' : 'No taxes paid yet.'}
        </div>
      </SectionCard>
    );
  }

  const labels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.en;

  return (
    <SectionCard title={t('tax.fiscal_summary')}>
      <div className="space-y-2 text-xs font-mono">
        {/* Total taxes */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Receipt className="h-3 w-3" />
            {t('tax.ir_paid')}
          </span>
          <span className="text-[hsl(var(--terminal-red))]">{formatCurrency(taxState.totalIRPaid)}</span>
        </div>
        {taxState.totalIOFPaid > 0.01 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3 w-3" />
              {t('tax.iof_paid')}
            </span>
            <span className="text-[hsl(var(--terminal-red))]">{formatCurrency(taxState.totalIOFPaid)}</span>
          </div>
        )}

        {/* Accumulated losses for carry-forward */}
        {lossEntries.length > 0 && (
          <>
            <div className="border-t border-border/30 pt-2 mt-2">
              <span className="text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <TrendingDown className="h-3 w-3" />
                {t('tax.accumulated_loss')}
              </span>
            </div>
            {lossEntries.map(({ category, amount }) => (
              <div key={category} className="flex justify-between pl-4">
                <span className="text-muted-foreground">{labels[category]}</span>
                <span className="text-[hsl(var(--terminal-amber))]">{formatCurrency(amount)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </SectionCard>
  );
}
