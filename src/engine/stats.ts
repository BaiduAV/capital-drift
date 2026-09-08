/** A zero balance that remains zero has no invested return to measure.
 * A positive balance after zero has no valid percentage base (e.g. an external deposit).
 * null means unavailable, never a fabricated zero or an infinite return. */
function dailyReturns(equity: number[]): number[] | null {
  if (equity.some(value => !Number.isFinite(value) || value < 0)) return null;
  const returns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1] === 0) {
      if (equity[i] > 0) return null;
      continue;
    }
    const change = (equity[i] - equity[i - 1]) / equity[i - 1];
    if (!Number.isFinite(change)) return null;
    returns.push(change);
  }
  return returns;
}

/** Annualized sample standard deviation; requires two observed returns. */
export function volatility(equity: number[]): number | null {
  const returns = dailyReturns(equity);
  if (!returns || returns.length < 2) return null;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const value = Math.sqrt(variance * 252);
  return Number.isFinite(value) ? value : null;
}

/** Existing simple annualization convention, using each series' actual starting balance. */
export function sharpeRatio(equity: number[], cdiAccumulated: number[]): number | null {
  const vol = volatility(equity);
  if (vol == null || vol === 0 || equity.length !== cdiAccumulated.length
    || equity[0] <= 0 || !cdiAccumulated.every(v => Number.isFinite(v) && v > 0)) return null;
  const totalReturn = equity[equity.length - 1] / equity[0] - 1;
  const cdiReturn = cdiAccumulated[cdiAccumulated.length - 1] / cdiAccumulated[0] - 1;
  const value = (totalReturn - cdiReturn) * (252 / (equity.length - 1)) / vol;
  return Number.isFinite(value) ? value : null;
}

export function winRate(equity: number[]): number | null {
  const returns = dailyReturns(equity);
  return returns?.length ? returns.filter(r => r > 0).length / returns.length : null;
}

export function bestDay(equity: number[]): number | null {
  const returns = dailyReturns(equity);
  return returns?.length ? returns.reduce((best, r) => Math.max(best, r), -Infinity) : null;
}

export function worstDay(equity: number[]): number | null {
  const returns = dailyReturns(equity);
  return returns?.length ? returns.reduce((worst, r) => Math.min(worst, r), Infinity) : null;
}
