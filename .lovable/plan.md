

# Patrimônio — Phase 1: Simulation Engine

## Overview
Build the deterministic simulation engine as a standalone, testable module. No UI yet — just the core logic with unit tests to validate correctness. Once the engine is solid, we'll layer the UI on top in Phase 2.

---

## 1. Engine Foundation (`src/engine/`)

### Types & Data Structures
- Define all core types: `GameState`, `AssetDefinition`, `AssetState`, `DayResult`, `EventCard`, `Position`, `RegimeId`, etc.
- Define the full asset catalog (8 fixed income, 12 stocks, 4 ETFs, 4 FIIs, 4 crypto) with their properties, sectors, and risk profiles.

### Seeded RNG
- Implement a deterministic RNG (mulberry32) so the same seed always produces the same simulation — critical for testing and reproducibility.

### Parameters
- Encode all parameters from the parameters document into a structured `params.ts`: macro variables, regime transitions, drift/vol tables per asset class per regime, correlation strengths, costs/spreads, dividend schedules, event probabilities and impacts.

---

## 2. Core Simulation Logic

### Regime System
- Implement regime transitions (Calm, Bull, Bear, Crisis, Crypto Euphoria) with daily switch probability and transition matrix.

### Macro Updates
- Daily random walk for base rate and inflation, bounded by min/max, influenced by regime drift.

### Price Generation
- Generate daily returns per asset using drift + volatility + correlated market factor.
- Separate correlation groups (equities, crypto, fixed income) with crisis cross-linking.
- Apply returns to prices.

### Events System
- Daily event probability based on regime.
- Event types: macro (rate hikes/cuts, inflation), sectoral, crypto (hacks, euphoria, rug pulls), credit.
- Each event applies shocks to returns, rates, inflation, or credit status.

### Credit Watch & Default
- Debêntures can enter "watch" status with daily probability based on rating.
- During watch window (7 days), default can occur with principal loss.

### Dividends & Distributions
- FIIs pay monthly, stocks pay quarterly.
- Automatically credit cash on payment days.

---

## 3. Day & Period Simulation

### `simulateDay`
- Orchestrate one full day: regime check → macro update → generate returns → events → apply prices → dividends → credit → update history → return result.

### `simulatePeriod` (Fast-Forward)
- Loop `simulateDay` N times (7/30/90 days) with no player trades.
- Collect and rank events by impact.
- Generate period summary: total return, drawdown, top movers, missed opportunities.

---

## 4. Trading Helpers
- `quoteBuy` / `quoteSell` functions that apply fees, spreads, and check halting/liquidity rules.
- Update cash and portfolio positions.

---

## 5. Invariants & Tests
- Sanity checks: prices never negative, cash never NaN, equity consistent.
- Unit tests:
  - Same seed → identical simulation
  - Crisis increases effective correlation
  - Fast-forward N days = running simulateDay N times without trades
  - Events apply correct shocks
  - Dividends pay on schedule
  - Credit default mechanics work correctly

---

## 6. i18n Foundation
- Set up a lightweight internationalization system (PT-BR + English) for all game text: event descriptions, asset names, UI labels.
- Engine event cards will reference translation keys rather than hardcoded strings.

---

## What Comes Next (Phase 2)
After the engine is validated, we'll build the dark terminal-style UI with: Dashboard, Market view, Portfolio, Trading, History, and Period Reports — all powered by this engine with localStorage persistence.

