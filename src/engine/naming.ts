// ── Deterministic Naming logic for Assets ──
// Tickers are derived from company names (first 4 significant consonants/chars).
// All names and tickers are guaranteed unique via shared sets.

import type { RNG } from './rng';
import type { Sector } from './types';

function removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Derive a 4-char ticker prefix from a company name */
function deriveTicker(name: string): string {
    const clean = removeAccents(name).toUpperCase().replace(/[^A-Z]/g, '');
    // Take first 4 chars — prioritize consonants but ensure 4 chars
    const consonants = clean.replace(/[AEIOU]/g, '');
    if (consonants.length >= 4) return consonants.substring(0, 4);
    // Fill with remaining chars
    return clean.substring(0, 4).padEnd(4, 'X');
}

function shuffled<T>(arr: T[], rng: RNG): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ── Company name pools (large enough to never collide) ──

const STOCK_NAMES: Partial<Record<Sector, string[]>> = {
    BANCOS: ['Banco Nordeste', 'CredPay', 'FinBank', 'Banco Plural', 'NovaCred', 'DigiBank', 'BancoFlex', 'CredTrust', 'Banco Lume', 'SafraPay'],
    ENERGIA: ['SolForce', 'VentoPower', 'HidroNova', 'LuzVerde', 'EnergiaBR', 'PowerGrid', 'FotoWatt', 'AmpereGo', 'VoltaSul', 'RaioEnergy'],
    VAREJO: ['MegaShop', 'NovaTrend', 'FlexModa', 'SuperBuy', 'UrbanStore', 'PrimeMart', 'LojaViva', 'CompraMax', 'ModaCasa', 'EstiloBR'],
    AGRO: ['AgroBrasil', 'SafraGold', 'CampoBom', 'TerraViva', 'GraoRico', 'VerdeCampo', 'ColheitaSul', 'PlantioBR'],
    TECH: ['ByteNova', 'CloudBR', 'DataPulse', 'NexTech', 'CodeForge', 'PixelWave', 'AppVenture', 'LogicSoft', 'SynapseAI', 'CyberLink'],
    MINERACAO: ['MineroSteel', 'FerroNorte', 'MetalBR', 'OuroVale', 'AcoForte', 'GeoMetal', 'RochaBR', 'MineralSul'],
    SAUDE: ['VidaPlena', 'MedGroup', 'SaudeMax', 'BioLab', 'CareVita', 'PharmaGo', 'ClinicaBR', 'PulseHealth'],
    INDUSTRIA: ['IndusBR', 'MecaTech', 'ForjaMax', 'TurboInd', 'AutoParts', 'SteelWorks', 'FabricaBR', 'MotorSul'],
    UTILITIES: ['AquaPura', 'SaneBR', 'HidroServ', 'GasNova', 'EcoServ', 'UtilPrime', 'AguaClear', 'ServiLuz'],
    IMOB: ['CasaNova', 'UrbanBuild', 'TorreAlta', 'MetroLiving', 'VidaHouse', 'SkyBuild', 'ConstruBR', 'MoradaBR'],
    TELECOM: ['ConectaBR', 'FibraLink', 'NetPlus', 'TeleNova', 'WaveComm', 'DataLink', 'SignalBR', 'RedeMais'],
    LOGISTICA: ['TransLog', 'ViaRapida', 'CargoMax', 'RotaBR', 'ExpressGo', 'FluxLog', 'FreteJa', 'NavegaBR'],
};

const FII_NAMES: Record<string, string[]> = {
    BRICK: ['FII Horizonte', 'FII Torre Prime', 'FII Ancora', 'FII Jardins', 'FII Centro', 'FII Planalto'],
    PAPER: ['FII Credito Ativo', 'FII Renda Plus', 'FII Capital CRI', 'FII Papel Seguro', 'FII Yield Max', 'FII JurosBR'],
    LOGISTICA: ['FII GalpaoBR', 'FII LogCenter', 'FII DepositoMax', 'FII ArmazemGo', 'FII RotaLog', 'FII HubBR'],
    HYBRID: ['FII MixRenda', 'FII FlexFund', 'FII MultiAlfa', 'FII Diverso', 'FII Equilibrio', 'FII BlendCap'],
};

const CRYPTO_NAMES = [
    'NovaCoin', 'ChainPrime', 'BlockForge', 'CryptoNexus',
    'LedgerX', 'HashVault', 'MoonToken', 'PixelCoin',
    'RocketDoge', 'MemeChain', 'HyperBit', 'StarToken',
    'ByteChain', 'NeonCrypto', 'PulseCoin', 'QuantumBit',
];

const FALLBACK_NAMES = ['NovaCorp', 'HoldingBR', 'GrowthCo', 'VenturePrime', 'EquityMax', 'CapitalBR', 'FundoBR', 'AlphaCo'];

/** Shared state across all generators in a single catalog build */
export interface NamingContext {
    usedTickers: Set<string>;
    usedNames: Set<string>;
    rng: RNG;
    // Shuffled pools that get consumed (no duplicates)
    _cryptoPool?: string[];
}

export function createNamingContext(rng: RNG): NamingContext {
    return {
        usedTickers: new Set(),
        usedNames: new Set(),
        rng,
    };
}

function pickUniqueName(pool: string[], ctx: NamingContext): string {
    const shuffledPool = shuffled(pool.filter(n => !ctx.usedNames.has(n)), ctx.rng);
    const name = shuffledPool[0] || `Company_${ctx.usedNames.size}`;
    ctx.usedNames.add(name);
    return name;
}

function makeUniqueTicker(base: string, suffix: string, ctx: NamingContext): string {
    let ticker = `${base}${suffix}`;
    if (!ctx.usedTickers.has(ticker)) {
        ctx.usedTickers.add(ticker);
        return ticker;
    }
    // Try variations
    for (let i = 1; i <= 9; i++) {
        const alt = `${base.substring(0, 3)}${i}${suffix}`;
        if (!ctx.usedTickers.has(alt)) {
            ctx.usedTickers.add(alt);
            return alt;
        }
    }
    // Last resort
    const fallback = `${base}${Math.floor(ctx.rng.next() * 90 + 10)}`;
    ctx.usedTickers.add(fallback);
    return fallback;
}

export function generateStockIdentity(ctx: NamingContext, sector: Sector): { ticker: string; displayName: string } {
    const pool = STOCK_NAMES[sector] || FALLBACK_NAMES;
    const displayName = pickUniqueName(pool, ctx);

    const prefix = deriveTicker(displayName);
    const tickerNum = ctx.rng.next() > 0.8 ? '4' : '3';
    const ticker = makeUniqueTicker(prefix, tickerNum, ctx);

    return { ticker, displayName };
}

export function generateFIIIdentity(ctx: NamingContext, sector: Sector): { ticker: string; displayName: string } {
    const pool = FII_NAMES[sector] || FII_NAMES['HYBRID']!;
    const displayName = pickUniqueName(pool, ctx);

    // Derive from the distinctive part (after "FII ")
    const namePart = displayName.replace(/^FII\s+/i, '');
    const prefix = deriveTicker(namePart);
    const ticker = makeUniqueTicker(prefix, '11', ctx);

    return { ticker, displayName };
}

export function generateCryptoIdentity(ctx: NamingContext): { ticker: string; displayName: string } {
    // Lazy-init shuffled crypto pool so all 4 cryptos draw from the same unique pool
    if (!ctx._cryptoPool) {
        ctx._cryptoPool = shuffled(CRYPTO_NAMES, ctx.rng);
    }

    const displayName = ctx._cryptoPool.find(n => !ctx.usedNames.has(n)) || `Crypto_${ctx.usedNames.size}`;
    ctx.usedNames.add(displayName);

    const prefix = deriveTicker(displayName);
    const ticker = makeUniqueTicker(prefix, '', ctx);

    return { ticker, displayName };
}

// Used for dynamic IPOs during simulation
export function generateAssetIdentity(rng: RNG, sector: Sector, _listIndex: number): { ticker: string; nameKey: string; companyName: string } {
    const pool = STOCK_NAMES[sector] || FALLBACK_NAMES;
    const shuffledPool = shuffled(pool, rng);
    const companyName = shuffledPool[0] || `IPO_${_listIndex}`;

    const prefix = deriveTicker(companyName);
    let tickerNum = '3';
    if (rng.next() > 0.8) tickerNum = '4';

    const ticker = `${prefix}${tickerNum}`;
    const nameKey = `asset.${ticker.toLowerCase()}`;

    return { ticker, nameKey, companyName };
}
