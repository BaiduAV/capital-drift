import { useGame } from '@/context/GameContext';
import { availableCash, reservedCash } from '@/engine/cash';

export default function CashBalances() {
  const { state, locale } = useGame();
  const reserved = reservedCash(state);
  const pending = state.pendingSettlements ?? [];
  if (!reserved && !pending.length) return null;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value);
  return (
    <aside aria-label={locale === 'pt-BR' ? 'Disponibilidade do caixa' : 'Cash availability'} className="mb-3 rounded border p-3 text-xs space-y-1">
      <p>{locale === 'pt-BR' ? 'Disponível para operações' : 'Available for trading'}: {money(availableCash(state))}</p>
      {reserved > 0 && <p>{locale === 'pt-BR' ? 'Comprometido com IPOs' : 'Committed to IPOs'}: {money(reserved)}</p>}
      {pending.map((item, index) => <p key={`${item.assetId}-${item.dueDay}-${index}`}>
        {item.assetId}: {money(item.amount)} — {locale === 'pt-BR' ? 'disponível no dia' : 'available on day'} {item.dueDay}
      </p>)}
    </aside>
  );
}
