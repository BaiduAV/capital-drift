// ── IOF Regressivo (renda fixa, resgates em até 30 dias) ──
// Day 1: 96%, Day 2: 93%, ... Day 29: 3%, Day 30+: 0%
const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
];

export function getIOFRate(holdingDays: number): number {
  holdingDays = Math.floor(holdingDays);
  if (holdingDays <= 0) return 0.96;
  if (holdingDays >= 30) return 0;
  return (IOF_TABLE[holdingDays - 1] ?? 0) / 100;
}

// ── IR Regressivo (renda fixa: CDB, Tesouro, Debêntures) ──
export function getFixedIncomeIRRate(holdingDays: number): number {
  if (holdingDays <= 180) return 0.225;
  if (holdingDays <= 360) return 0.20;
  if (holdingDays <= 720) return 0.175;
  return 0.15;
}
