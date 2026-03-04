// ── Deterministic Naming logic for Assets ──

import type { RNG } from './rng';
import type { Sector } from './types';

function removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const PREFIXES: Partial<Record<Sector, string[]>> = {
    BANCOS: ['ITAU', 'BRAD', 'BANC', 'SANT', 'PANC', 'CRED'],
    ENERGIA: ['ELET', 'ENER', 'CPFL', 'NEOE', 'TAES', 'ENGI'],
    VAREJO: ['LREN', 'MGLU', 'AMER', 'CBDC', 'NTCO', 'SOMA'],
    AGRO: ['AGRO', 'SLCE', 'RAIZ', 'SMTO', 'TENT', 'SOJA'],
    TECH: ['TOTS', 'LWSA', 'MASH', 'CASH', 'POWE', 'TECH'],
    MINERACAO: ['VALE', 'CSNA', 'USIM', 'GGBR', 'AURA', 'CMIN'],
    SAUDE: ['HAPV', 'QUAL', 'FLRY', 'RDOR', 'MATD', 'ODPV'],
    INDUSTRIA: ['WEGE', 'EMBR', 'TUPY', 'POMO', 'ROMI', 'MYPK'],
    UTILITIES: ['SBSP', 'CSMG', 'SAPR', 'CGAS', 'SANB', 'AESB'],
    IMOB: ['CYRE', 'MRVE', 'EZTC', 'DIRR', 'EVEN', 'TEND'],
    TELECOM: ['VIVO', 'TIMS', 'OIBR', 'BRPD', 'NETC', 'DESK'],
    LOGISTICA: ['RAIL', 'CCRO', 'ECOR', 'STBP', 'JSLG', 'TGMA'],
};

const FALLBACK_PREFIXES = ['CORP', 'HOLD', 'PART', 'VENT', 'EQTY', 'ASST', 'CAPT', 'GROW'];

export function generateAssetIdentity(rng: RNG, sector: Sector, listIndex: number): { ticker: string; nameKey: string } {
    // Use RNG to pick a prefix based on the sector deterministically
    // We can "hash" the listIndex directly or just use the RNG since we pass a dedicated names rng.
    const prefixes = PREFIXES[sector] || FALLBACK_PREFIXES;

    // Pick a prefix
    const prefixIdx = Math.floor(rng.next() * prefixes.length);
    const prefix = prefixes[prefixIdx];

    // For suffix, in Brazil usually 3 for common stock, 4 for pref, 11 for units.
    // The user requested 4 letras + "3". The prefix must be 4 characters.
    const baseTicker = prefix.substring(0, 4).toUpperCase();
    // Ensure the ticker is 4 chars + number
    const paddedTicker = baseTicker.padEnd(4, 'X');

    let tickerNum = '3';
    if (rng.next() > 0.8) tickerNum = '4';
    if (rng.next() > 0.95) tickerNum = '11';

    // To differentiate identical tickers if they get generated
    const idSuffix = listIndex > 0 ? `${listIndex}` : '';
    let ticker = `${paddedTicker}${tickerNum}`;

    // This is a naive generated name. A real app would have localized parts.
    const nameKey = `asset.${ticker.toLowerCase()}`;

    return { ticker, nameKey };
}
