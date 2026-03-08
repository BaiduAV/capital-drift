// ── Deterministic Naming logic for Assets ──

import type { RNG } from './rng';
import type { Sector, AssetClass } from './types';

// ── Stock company names by sector ──
const STOCK_NAMES: Partial<Record<Sector, string[]>> = {
    BANCOS: ['Banco Nordeste', 'CredPay', 'FinBank', 'Banco Plural', 'NovaCred', 'DigiBank', 'BancoFlex', 'CredTrust'],
    ENERGIA: ['SolForce', 'VentoPower', 'HidroNova', 'LuzVerde', 'EnergiaBR', 'PowerGrid', 'FotoWatt', 'AmpèreGo'],
    VAREJO: ['MegaShop', 'NovaTrend', 'FlexModa', 'SuperBuy', 'UrbanStore', 'PrimeMart', 'LojaViva', 'CompraMax'],
    AGRO: ['AgroBrasil', 'SafraGold', 'CampoBom', 'TerraViva', 'GrãoRico', 'VerdeCampo'],
    TECH: ['ByteNova', 'CloudBR', 'DataPulse', 'NexTech', 'CodeForge', 'PixelWave', 'AppVenture', 'LogicSoft'],
    MINERACAO: ['MineroSteel', 'FerroNorte', 'MetalBR', 'OuroVale', 'AçoForte', 'GeoMetal'],
    SAUDE: ['VidaPlena', 'MedGroup', 'SaúdeMax', 'BioLab', 'CareVita', 'PharmaGo'],
    INDUSTRIA: ['IndusBR', 'MecaTech', 'ForjaMax', 'TurboInd', 'AutoParts', 'SteelWorks'],
    UTILITIES: ['AquaPura', 'SaneBR', 'HidroServ', 'GásNova', 'EcoServ', 'UtilPrime'],
    IMOB: ['CasaNova', 'UrbanBuild', 'TorreAlta', 'MetroLiving', 'VidaHouse', 'SkyBuild'],
    TELECOM: ['ConectaBR', 'FibraLink', 'NetPlus', 'TeleNova', 'WaveComm', 'DataLink'],
    LOGISTICA: ['TransLog', 'ViaRápida', 'CargoMax', 'RotaBR', 'ExpressGo', 'FluxLog'],
};

// ── FII fund names ──
const FII_NAMES: Record<string, string[]> = {
    BRICK: ['FII Horizonte', 'FII Torre Prime', 'FII Âncora', 'FII Jardins', 'FII Centro', 'FII Planalto'],
    PAPER: ['FII Crédito Ativo', 'FII Renda Plus', 'FII Capital CRI', 'FII Papel Seguro', 'FII Yield', 'FII Juros'],
    LOGISTICA: ['FII GalpãoBR', 'FII LogCenter', 'FII DepósitoMax', 'FII ArmazémGo', 'FII Rota', 'FII Hub'],
    HYBRID: ['FII MixRenda', 'FII FlexFund', 'FII Multi', 'FII Diverso', 'FII Equilíbrio', 'FII Blend'],
};

// ── Crypto names ──
const CRYPTO_MAJOR_NAMES = ['NovaCoin', 'ChainPrime', 'BlockForge', 'CryptoNexus', 'LedgerX', 'HashVault'];
const CRYPTO_ALT_NAMES = ['MoonToken', 'PixelCoin', 'RocketDoge', 'MemeChain', 'HyperBit', 'StarToken'];

// ── Ticker prefixes by sector ──
const STOCK_PREFIXES: Partial<Record<Sector, string[]>> = {
    BANCOS: ['BNOR', 'CRPB', 'FNBK', 'BPLU', 'NCRD', 'DGBK', 'BFLX', 'CTRS'],
    ENERGIA: ['SLFC', 'VNTP', 'HDNV', 'LZVD', 'ENBR', 'PWGR', 'FTWT', 'AMPG'],
    VAREJO: ['MGSP', 'NVTR', 'FXMD', 'SPBY', 'UBST', 'PRMT', 'LJVV', 'CPMX'],
    AGRO: ['AGBR', 'SFGD', 'CPBM', 'TRVV', 'GRRK', 'VDCP'],
    TECH: ['BTNV', 'CLBR', 'DTPL', 'NXTC', 'CDFG', 'PXWV', 'APVT', 'LGSF'],
    MINERACAO: ['MNST', 'FRNT', 'MTBR', 'ORVL', 'ACFT', 'GMTL'],
    SAUDE: ['VDPL', 'MDGP', 'SDMX', 'BILB', 'CRVT', 'PHGO'],
    INDUSTRIA: ['IDBR', 'MCTC', 'FJMX', 'TBID', 'ATPT', 'STWK'],
    UTILITIES: ['AQPR', 'SNBR', 'HDSV', 'GSNV', 'ECSV', 'UTPR'],
    IMOB: ['CSNV', 'UBLD', 'TRLT', 'MTLV', 'VDHS', 'SKBD'],
    TELECOM: ['CNBR', 'FBLK', 'NTPL', 'TLNV', 'WVCM', 'DTLK'],
    LOGISTICA: ['TSLG', 'VRPD', 'CGMX', 'RTBR', 'XPGO', 'FXLG'],
};

const FII_PREFIXES = ['HRZT', 'TRPR', 'ANCR', 'JRDN', 'CNTR', 'PLNT', 'CRAT', 'RDPL', 'CCRI', 'PPSG', 'YELD', 'JRSS', 'GLPB', 'LGCT', 'DPMX', 'ARMG', 'ROTA', 'HUBF', 'MXRD', 'FXFD', 'MLTI', 'DVSF', 'EQLB', 'BLND'];
const CRYPTO_PREFIXES = ['NVCN', 'CHPR', 'BKFG', 'CNXS', 'LDGX', 'HSVT', 'MNTK', 'PXCN', 'RKDG', 'MMCH', 'HPBT', 'SRTK'];

const FALLBACK_NAMES = ['NovaCorp', 'HoldingBR', 'GrowthCo', 'VenturePrime', 'EquityMax', 'CapitalBR'];
const FALLBACK_PREFIXES = ['CORP', 'HOLD', 'PART', 'VENT', 'EQTY', 'ASST', 'CAPT', 'GROW'];

function pickAndRemove<T>(arr: T[], rng: RNG): T {
    const idx = Math.floor(rng.next() * arr.length);
    return arr.splice(idx, 1)[0];
}

export function generateStockIdentity(rng: RNG, sector: Sector, usedTickers: Set<string>): { ticker: string; displayName: string } {
    const names = [...(STOCK_NAMES[sector] || FALLBACK_NAMES)];
    const prefixes = [...(STOCK_PREFIXES[sector] || FALLBACK_PREFIXES)];

    const displayName = pickAndRemove(names, rng);
    const prefix = pickAndRemove(prefixes, rng);

    let tickerNum = '3';
    if (rng.next() > 0.8) tickerNum = '4';

    let ticker = `${prefix}${tickerNum}`;
    // Ensure uniqueness
    let attempts = 0;
    while (usedTickers.has(ticker) && attempts < 10) {
        const altPrefix = pickAndRemove(prefixes.length > 0 ? prefixes : [...FALLBACK_PREFIXES], rng);
        ticker = `${altPrefix}${tickerNum}`;
        attempts++;
    }
    usedTickers.add(ticker);

    return { ticker, displayName };
}

export function generateFIIIdentity(rng: RNG, sector: Sector, usedTickers: Set<string>): { ticker: string; displayName: string } {
    const names = [...(FII_NAMES[sector] || FII_NAMES['HYBRID']!)];
    const prefixes = [...FII_PREFIXES];

    const displayName = pickAndRemove(names, rng);
    const prefix = pickAndRemove(prefixes, rng);

    let ticker = `${prefix}11`;
    let attempts = 0;
    while (usedTickers.has(ticker) && attempts < 10) {
        const altPrefix = pickAndRemove(prefixes, rng);
        ticker = `${altPrefix}11`;
        attempts++;
    }
    usedTickers.add(ticker);

    return { ticker, displayName };
}

export function generateCryptoIdentity(rng: RNG, isMajor: boolean, usedTickers: Set<string>): { ticker: string; displayName: string } {
    const names = [...(isMajor ? CRYPTO_MAJOR_NAMES : CRYPTO_ALT_NAMES)];
    const prefixes = [...CRYPTO_PREFIXES];

    const displayName = pickAndRemove(names, rng);
    const prefix = pickAndRemove(prefixes, rng);

    let ticker = prefix;
    let attempts = 0;
    while (usedTickers.has(ticker) && attempts < 10) {
        const altPrefix = pickAndRemove(prefixes, rng);
        ticker = altPrefix;
        attempts++;
    }
    usedTickers.add(ticker);

    return { ticker, displayName };
}

// Used for dynamic IPOs during simulation
export function generateAssetIdentity(rng: RNG, sector: Sector, listIndex: number): { ticker: string; nameKey: string; companyName: string } {
    const names = [...(STOCK_NAMES[sector] || FALLBACK_NAMES)];
    const prefixes = [...(STOCK_PREFIXES[sector] || FALLBACK_PREFIXES)];

    const companyName = pickAndRemove(names, rng);
    const prefix = pickAndRemove(prefixes, rng);

    let tickerNum = '3';
    if (rng.next() > 0.8) tickerNum = '4';
    if (rng.next() > 0.95) tickerNum = '11';

    const ticker = `${prefix}${tickerNum}`;
    const nameKey = `asset.${ticker.toLowerCase()}`;

    return { ticker, nameKey, companyName };
}
