import { dateAtDay } from '@/engine/financialCalendar';
import { useGame } from '@/context/GameContext';
import { availableCash, reservedCash } from '@/engine/cash';

export default function CashBalances() {
  const { state, locale } = useGame();
  const reserved = reservedCash(state);
  const pending = state.pendingSettlements ?? [];
  const custody = Object.values(state.portfolio).reduce((sum, pos) => sum + (pos.fixedIncomeLots ?? []).reduce((total, lot) => total + lot.custodyAccrued, 0), 0);
  const recent = (state.fixedIncomeLog ?? []).filter(e => e.day >= state.dayIndex - 5);
  if (!reserved && !pending.length && !recent.length && custody < 0.005 && state.fixedIncomeMigrationDay == null) return null;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value);
  return (
    <aside aria-label={locale === 'pt-BR' ? 'Disponibilidade do caixa' : 'Cash availability'} className="mb-3 rounded border p-3 text-xs space-y-1">
      <p>{locale === 'pt-BR' ? 'Disponível para operações' : 'Available for trading'}: {money(availableCash(state))}</p>
      {custody >= 0.005 && <p>{locale === 'pt-BR' ? 'Custódia provisionada, já descontada do patrimônio líquido' : 'Accrued custody, already deducted from net equity'}: {money(custody)}</p>}
      {reserved > 0 && <p>{locale === 'pt-BR' ? 'Comprometido com IPOs' : 'Committed to IPOs'}: {money(reserved)}</p>}
      {state.fixedIncomeMigrationDay != null && <p>{locale === 'pt-BR' ? 'Renda fixa migrada: patrimônio e custo foram preservados. As aplicações antigas usam a idade média disponível; vencimentos começam na migração. Novas compras têm lotes exatos.' : 'Fixed income migrated: value and cost were preserved. Old investments use the available average age; maturity terms start at migration. New purchases have exact lots.'}</p>}
      {recent.map((entry, i) => <p key={`event-${i}`}>{entry.assetId} · {entry.type === 'MATURITY' ? (locale === 'pt-BR' ? 'Vencimento creditado' : 'Maturity paid') : (locale === 'pt-BR' ? 'Recuperação projetada após inadimplência' : 'Projected default recovery')}: {money(entry.amount)}</p>)}
      {recent.some(e => e.type !== 'MATURITY') && <p>{locale === 'pt-BR' ? 'Prazos de recuperação de crédito são hipóteses do cenário, sem garantia de prazo real do FGC ou do emissor.' : 'Credit recovery delays are scenario assumptions, not guaranteed FGC or issuer deadlines.'}</p>}
      {pending.map((item, index) => <p key={`${item.assetId}-${item.dueDay}-${index}`}>
        {item.assetId}: {money(item.amount)} — {locale === 'pt-BR' ? 'disponível no dia' : 'available on day'} {dateAtDay(state, item.dueDay)}
      </p>)}
    </aside>
  );
}
