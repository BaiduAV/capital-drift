import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useGame } from '@/context/GameContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Briefcase,
  ArrowLeftRight,
  Clock,
  Globe,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
  Trophy,
  Sun,
  Moon,
  Smile,
  Rocket,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { RegimeId } from '@/engine/types';
import { Button } from '@/components/ui/button';
import { KPIChip } from '@/components/ui/KPIChip';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import OnboardingTutorial, { openTutorial } from '@/components/game/OnboardingTutorial';
import BottomNav from '@/components/game/BottomNav';
import { loadTheme, saveTheme, type AppTheme } from '@/engine/persistence';
import { Slider } from '@/components/ui/slider';

const REGIME_ICON: Record<RegimeId, LucideIcon> = {
  CALM: Smile,
  BULL: TrendingUp,
  BEAR: TrendingDown,
  CRISIS: ShieldAlert,
  CRYPTO_EUPHORIA: Rocket,
};

const navItems = [
  { path: '/', icon: LayoutDashboard, labelEn: 'Dashboard', labelPt: 'Painel' },
  { path: '/market', icon: TrendingUp, labelEn: 'Market', labelPt: 'Mercado' },
  { path: '/portfolio', icon: Briefcase, labelEn: 'Portfolio', labelPt: 'Carteira' },
  { path: '/trade', icon: ArrowLeftRight, labelEn: 'Trade', labelPt: 'Negociar' },
  { path: '/history', icon: Clock, labelEn: 'History', labelPt: 'Histórico' },
  { path: '/achievements', icon: Trophy, labelEn: 'Achievements', labelPt: 'Conquistas' },
];

export default function AppLayout() {
  const { state, locale, equity, switchLocale, newGame, updateMarginCallSettings, t } = useGame();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(loadTheme);
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [mcThreshold, setMcThreshold] = useState(() => Math.round(state.marginCallSettings.drawdownThreshold * 100));
  const [mcRecovery, setMcRecovery] = useState(() => Math.round(state.marginCallSettings.recoveryTarget * 100));
  const location = useLocation();

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  }, [theme]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const formatCurrency = (val: number) =>
    Math.abs(val) >= 1_000_000
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 2 }).format(val)
      : new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);

  const formatPct = (val: number) =>
    (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + '%';

  const totalReturn = (equity - 5000) / 5000;

  const sidebarContent = (
    <>
      <nav className="flex-1 py-2 space-y-0.5 px-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-mono text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-primary font-semibold"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {(!collapsed || mobileOpen) && <span>{locale === 'pt-BR' ? item.labelPt : item.labelEn}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={openTutorial}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {(!collapsed || mobileOpen) && <span>{locale === 'pt-BR' ? 'Tutorial' : 'Tutorial'}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={switchLocale}
        >
          <Globe className="h-3.5 w-3.5" />
          {(!collapsed || mobileOpen) && <span>{locale === 'pt-BR' ? 'EN' : 'PT'}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {(!collapsed || mobileOpen) && <span>{theme === 'dark' ? (locale === 'pt-BR' ? 'Tema Claro' : 'Light Mode') : (locale === 'pt-BR' ? 'Tema Escuro' : 'Dark Mode')}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-3.5 w-3.5" />
          {(!collapsed || mobileOpen) && <span>{locale === 'pt-BR' ? 'Configurações' : 'Settings'}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => { setSeedInput(''); setNewGameOpen(true); }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {(!collapsed || mobileOpen) && <span>{locale === 'pt-BR' ? 'Novo Jogo' : 'New Game'}</span>}
        </Button>
      </div>
    </>
  );

  const handleNewGame = () => {
    const trimmed = seedInput.trim();
    const seed = trimmed.length > 0 ? parseInt(trimmed, 10) : undefined;
    if (trimmed.length > 0 && (isNaN(seed!) || seed! < 0)) {
      toast.error(locale === 'pt-BR' ? 'Seed inválida. Use um número inteiro positivo.' : 'Invalid seed. Use a positive integer.');
      return;
    }
    newGame(seed);
    setNewGameOpen(false);
    toast.success(locale === 'pt-BR' ? 'Novo jogo iniciado!' : 'New game started!');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          {!collapsed && (
            <span className="font-sans text-sm font-bold tracking-wider text-primary terminal-glow">
              PATRIMÔNIO
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? (locale === 'pt-BR' ? 'Expandir menu' : 'Expand menu') : (locale === 'pt-BR' ? 'Recolher menu' : 'Collapse menu')}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col w-56 bg-sidebar border-r border-border transition-transform duration-200 md:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          <span className="font-sans text-sm font-bold tracking-wider text-primary terminal-glow">
            PATRIMÔNIO
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label={locale === 'pt-BR' ? 'Fechar menu' : 'Close menu'}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-3 py-2 bg-card gap-2">
          {/* Left: hamburger (mobile) + regime + day */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label={locale === 'pt-BR' ? 'Abrir menu' : 'Open menu'}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {(() => { const RegimeIcon = REGIME_ICON[state.regime]; return (
              <span key={state.regime} className={`regime-badge regime-${state.regime} shrink-0 inline-flex items-center gap-1 animate-scale-in`}>
                <RegimeIcon className="h-3.5 w-3.5 animate-[spin_0.5s_ease-out]" />
                {t(`regime.${state.regime}`)}
              </span>
            ); })()}
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {locale === 'pt-BR' ? 'DIA' : 'DAY'} {state.dayIndex}
            </span>
          </div>

          {/* Right: Premium macro stats */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <KPIChip
              className="hidden sm:inline-flex"
              label={locale === 'pt-BR' ? 'SELIC' : 'RATE'}
              value={`${(state.macro.baseRateAnnual * 100).toFixed(2)}%`}
            />
            <KPIChip
              className="hidden sm:inline-flex"
              label="IPCA"
              value={`${(state.macro.inflationAnnual * 100).toFixed(2)}%`}
            />
            <KPIChip
              label={locale === 'pt-BR' ? 'PAT' : 'EQ'}
              value={formatCurrency(equity)}
            />
            <KPIChip
              label={locale === 'pt-BR' ? 'RET' : 'RET'}
              value={formatPct(totalReturn)}
              trend={totalReturn > 0 ? 'up' : totalReturn < 0 ? 'down' : 'neutral'}
            />
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 pb-20 md:pb-4 scrollbar-terminal">
          <Outlet />
        </main>

        {/* Footer with seed */}
        <footer className="flex items-center justify-center border-t border-border/50 px-3 py-1.5 bg-card/50">
          <button
            className="text-[10px] text-muted-foreground/50 font-mono hover:text-muted-foreground transition-colors cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(String(state.seed));
              toast.success(locale === 'pt-BR' ? 'Seed copiada!' : 'Seed copied!');
            }}
          >
            seed #{state.seed}
          </button>
        </footer>
      </div>

      <BottomNav />
      <OnboardingTutorial />

      {/* New Game Dialog */}
      <Dialog open={newGameOpen} onOpenChange={setNewGameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-sans">
              {locale === 'pt-BR' ? 'Novo Jogo' : 'New Game'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt-BR'
                ? 'Seu progresso atual será perdido. Opcionalmente, insira uma seed para reproduzir uma partida específica.'
                : 'Your current progress will be lost. Optionally enter a seed to reproduce a specific game.'}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="seed-input" className="text-xs font-mono">
                Seed ({locale === 'pt-BR' ? 'opcional' : 'optional'})
              </Label>
              <Input
                id="seed-input"
                type="number"
                min="0"
                placeholder={locale === 'pt-BR' ? 'Ex: 42' : 'e.g. 42'}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNewGame()}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground/70">
                {locale === 'pt-BR'
                  ? 'Deixe vazio para uma seed aleatória. Mesma seed = mesmos eventos e preços.'
                  : 'Leave empty for a random seed. Same seed = same events and prices.'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setNewGameOpen(false)}>
              {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button size="sm" variant="destructive" onClick={handleNewGame}>
              {locale === 'pt-BR' ? 'Iniciar' : 'Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
