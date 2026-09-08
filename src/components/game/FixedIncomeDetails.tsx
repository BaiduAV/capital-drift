import { useGame } from '@/context/game-context';
import { dateAtDay, gameDate, calendarDaysBetween } from '@/engine/financialCalendar';
import { fixedIncomeLots, fixedIncomeSellCapacity, fixedIncomeOfferRate } from '@/engine/fixedIncome';

export default function FixedIncomeDetails({ assetId }: { assetId: string }) {
  const { state, locale } = useGame();
  const terms = state.assetCatalog[assetId]?.fixedIncome;
  const instrument = state.assets[assetId]?.fixedIncome;
  if (!terms || !instrument) return null;
  const pt = locale === 'pt-BR';
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const money = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(v);
  const date = (v: string) => new Date(v + 'T12:00:00Z').toLocaleDateString(locale, { timeZone: 'UTC' });
  const lots = fixedIncomeLots(state, assetId);
  const offerRate = fixedIncomeOfferRate(state, assetId);
  const rate = terms.indexer === 'CDI' ? `${pct(terms.cdiPercent)} CDI${terms.annualRate ? ` + ${pct(terms.annualRate)} a.a.` : ''}`
    : terms.indexer === 'SELIC' ? 'Selic'
    : `${terms.indexer === 'IPCA' ? 'IPCA + ' : ''}${pct(offerRate ?? instrument.marketYield)} a.a.`;
  const liquidity = terms.redemption === 'MATURITY' ? (pt ? 'Somente no vencimento' : 'At maturity only')
    : terms.redemption === 'SECONDARY' ? (pt ? 'Venda no mercado secundário; depende de comprador. Liquidação D+1.' : 'Secondary market sale, subject to a buyer. T+1 settlement.')
    : (pt ? `Diária${terms.lockCalendarDays ? ` após ${terms.lockCalendarDays} dias corridos por aplicação` : ''}` : `Daily${terms.lockCalendarDays ? ` after ${terms.lockCalendarDays} calendar days per deposit` : ''}`);
  return <section aria-label={pt ? 'Contrato de renda fixa' : 'Fixed income contract'} className="rounded-md border p-3 text-xs space-y-2">
    <p className="font-semibold">{pt ? 'Remuneração bruta' : 'Gross remuneration'}: {rate}</p>
    {offerRate !== undefined && <p>{pt ? 'Taxa da nova aplicação. Cada lote mantém a taxa contratada até seu vencimento; o preço de compra representa o valor aplicado por unidade.' : 'Rate for a new deposit. Each lot keeps its contracted rate until maturity; the purchase price is the deposit amount per unit.'}</p>}
    {terms.indexer === 'SELIC' && <>
      <p>{pt ? 'Taxa de ágio/deságio' : 'Premium/discount yield'}: {pct(instrument.marketYield)} a.a.</p>
      <p>{pt ? 'Valor nominal atualizado por unidade' : 'Updated nominal value per unit'}: {money(instrument.bookValue)}.</p>
      <p>{pt ? 'O preço desconta essa taxa até o vencimento. Deságio positivo reduz o preço; ágio eleva o preço acima do valor nominal atualizado. A venda antecipada pode ter perda.' : 'The price discounts this yield to maturity. A positive discount reduces the price; a premium raises it above the updated nominal value. An early sale can realize a loss.'}</p>
    </>}
    <p>{pt ? 'Emissor' : 'Issuer'}: {terms.issuer}</p>
    <p>{liquidity}</p>
    <p>{pt ? 'Vencimento' : 'Maturity'}: {terms.kind === 'BANK'
      ? `${terms.termBusinessDays} ${pt ? 'dias úteis por aplicação' : 'business days per deposit'}`
      : date(dateAtDay(state, instrument.maturityDay))}. {pt ? 'Pagamento único, sem cupons.' : 'Bullet payment, no coupons.'}</p>
    <p>{terms.fgcCovered
      ? (pt ? 'FGC: até R$ 250 mil por conglomerado, limitado a R$ 1 milhão por período de 4 anos. Reembolso não é imediato.' : 'FGC: up to R$250k per banking group, capped at R$1m per 4-year period. Reimbursement is not immediate.')
      : (pt ? 'Sem cobertura do FGC.' : 'No FGC coverage.')}</p>
    {terms.custodyAnnual > 0 && <p>{pt ? 'Custódia provisionada' : 'Accrued custody'}: {pct(terms.custodyAnnual)} a.a.{terms.indexer === 'SELIC' ? (pt ? ', apenas sobre o saldo acima de R$ 10 mil.' : ', only on the balance above R$10k.') : '.'}</p>}
    {terms.kind === 'TREASURY' && <p>{pt ? 'Compra liquida em D+1. Taxa válida até o vencimento; venda antecipada pelo preço de mercado. Resgates consideram a janela de D+0 do Tesouro.' : 'Purchases settle T+1. Yield applies through maturity; early sales use market prices. Redemptions assume the Treasury same-day window.'}</p>}
    {lots.length > 0 && <>
      <p>{pt ? 'Quantidade disponível para venda hoje' : 'Quantity available for sale today'}: {fixedIncomeSellCapacity(state, assetId)}</p>
      <div className="max-h-44 overflow-auto space-y-2" aria-label={pt ? 'Aplicações por lote' : 'Investment lots'}>
        {lots.map((lot, index) => <p key={`${lot.purchaseDate}-${index}`}>
          {lot.quantity} × {money(lot.unitCost)} — {date(lot.purchaseDate)} ({Math.max(0, calendarDaysBetween(lot.purchaseDate, gameDate(state)))} {pt ? 'dias corridos' : 'calendar days'});
          {' '}{pt ? 'vence' : 'matures'} {date(dateAtDay(state, lot.maturityDay))}{lot.custodyAccrued > 0 ? `; ${pt ? 'custódia' : 'custody'} ${money(lot.custodyAccrued)}` : ''}
          {lot.fixedAnnualRate !== undefined && <>{'; '}{pt ? 'taxa contratada' : 'contracted rate'} {pct(lot.fixedAnnualRate)} a.a.; {pt ? 'saldo bruto' : 'gross balance'} {money(lot.quantity * (lot.bookUnitValue ?? lot.unitCost))}</>}
        </p>)}
      </div>
    </>}
    <p className="text-muted-foreground">{pt ? 'Contrato ilustrativo do simulador. Índices e juros são simulados; não são cotações de uma oferta real.' : 'Illustrative simulation contract. Rates and indices are simulated, not a live offer.'}</p>
  </section>;
}
