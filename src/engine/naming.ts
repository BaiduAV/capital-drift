// ── Deterministic Naming logic for Assets ──

import type { RNG } from './rng';
import type { Sector } from './types';

const COMPANY_NAMES: Partial<Record<Sector, string[]>> = {
    BANCOS: ['Banco Nordeste', 'CredPay', 'FinBank', 'Banco Plural', 'NovaCred', 'DigiBank'],
    ENERGIA: ['SolForce', 'VentoPower', 'HidroNova', 'LuzVerde', 'EnergiaBR', 'PowerGrid'],
    VAREJO: ['MegaShop', 'NovaTrend', 'FlexModa', 'SuperBuy', 'UrbanStore', 'PrimeMart'],
    AGRO: ['AgroBrasil', 'SafraGold', 'CampoBom', 'TerraViva', 'GrãoRico', 'VerdeCampo'],
    TECH: ['ByteNova', 'CloudBR', 'DataPulse', 'NexTech', 'CodeForge', 'PixelWave'],
    MINERACAO: ['MineroSteel', 'FerroNorte', 'MetalBR', 'OuroVale', 'AçoForte', 'GeoMetal'],
    SAUDE: ['VidaPlena', 'MedGroup', 'SaúdeMax', 'BioLab', 'CareVita', 'PharmaGo'],
    INDUSTRIA: ['IndusBR', 'MecaTech', 'ForjaMax', 'TurboInd', 'AutoParts', 'SteelWorks'],
    UTILITIES: ['AquaPura', 'SaneBR', 'HidroServ', 'GásNova', 'EcoServ', 'UtilPrime'],
    IMOB: ['CasaNova', 'UrbanBuild', 'TorreAlta', 'MetroLiving', 'VidaHouse', 'SkyBuild'],
    TELECOM: ['ConectaBR', 'FibraLink', 'NetPlus', 'TeleNova', 'WaveComm', 'DataLink'],
    LOGISTICA: ['TransLog', 'ViaRápida', 'CargoMax', 'RotaBR', 'ExpressGo', 'FluxLog'],
};

const FALLBACK_NAMES = ['NovaCorp', 'HoldingBR', 'GrowthCo', 'VenturePrime', 'EquityMax', 'CapitalBR'];

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

export function generateAssetIdentity(rng: RNG, sector: Sector, listIndex: number): { ticker: string; nameKey: string; companyName: string } {
    const prefixes = PREFIXES[sector] || FALLBACK_PREFIXES;
    const names = COMPANY_NAMES[sector] || FALLBACK_NAMES;

    const prefixIdx = Math.floor(rng.next() * prefixes.length);
    const prefix = prefixes[prefixIdx];

    const nameIdx = Math.floor(rng.next() * names.length);
    const companyName = names[nameIdx];

    const baseTicker = prefix.substring(0, 4).toUpperCase();
    const paddedTicker = baseTicker.padEnd(4, 'X');

    let tickerNum = '3';
    if (rng.next() > 0.8) tickerNum = '4';
    if (rng.next() > 0.95) tickerNum = '11';

    const ticker = `${paddedTicker}${tickerNum}`;
    const nameKey = `asset.${ticker.toLowerCase()}`;

    return { ticker, nameKey, companyName };
}
