import { INITIAL_CASH } from './params';

/** Compute daily returns from equity array */
function dailyReturns(equity: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    returns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
  }
  return returns;
}

/** Annualized volatility (daily returns * sqrt(252)) */
export function volatility(equity: number[]): number {
  const rets = dailyReturns(equity);
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/** Annualized Sharpe ratio (excess return over CDI / volatility) */
export function sharpeRatio(equity: number[], cdiAccumulated: number[]): number {
  const vol = volatility(equity);
  if (vol === 0 || equity.length < 2) return 0;

  const totalReturn = (equity[equity.length - 1] - INITIAL_CASH) / INITIAL_CASH;
  const cdiReturn = (cdiAccumulated[cdiAccumulated.length - 1] - INITIAL_CASH) / INITIAL_CASH;
  const days = equity.length - 1;
  const annFactor = 252 / days;

  const annReturn = totalReturn * annFactor;
  const annCDI = cdiReturn * annFactor;

  return (annReturn - annCDI) / vol;
}

/** Win rate: percentage of positive daily returns */
export function winRate(equity: number[]): number {
  const rets = dailyReturns(equity);
  if (rets.length === 0) return 0;
  const wins = rets.filter(r => r > 0).length;
  return wins / rets.length;
}

/** Best single-day return */
export function bestDay(equity: number[]): number {
  const rets = dailyReturns(equity);
  if (rets.length === 0) return 0;
  return Math.max(...rets);
}

/** Worst single-day return */
export function worstDay(equity: number[]): number {
  const rets = dailyReturns(equity);
  if (rets.length === 0) return 0;
  return Math.min(...rets);
}
