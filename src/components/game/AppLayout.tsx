import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useGame } from '@/context/GameContext';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
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
  Flame,
  type LucideIcon,
} from 'lucide-react';
import type { RegimeId } from '@/engine/types';
import { Button } from '@/components/ui/button';
import { KPIChip } from '@/components/ui/KPIChip';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import OnboardingTutorial, { openTutorial } from '@/components/game/OnboardingTutorial';
import { loadTheme, saveTheme, type AppTheme } from '@/engine/persistence';

const REGIME_ICON: Record<RegimeId, LucideIcon> = {
  CALM: Smile,
  BULL: TrendingUp,
  BEAR: TrendingDown,
  CRISIS: ShieldAlert,
  CRYPTO_EUPHORIA: Rocket,
};

const navItems = [
  { path: '/', icon: LayoutDashboard, labelEn: 'Dashboard', labelPt: 'Painel' },
  { path: '/market', icon: TrendingUpIcon, labelEn: 'Market', labelPt: 'Mercado' },
  { path: '/portfolio', icon: Briefcase, labelEn: 'Portfolio', labelPt: 'Carteira' },
  { path: '/trade', icon: ArrowLeftRight, labelEn: 'Trade', labelPt: 'Negociar' },
  { path: '/history', icon: Clock, labelEn: 'History', labelPt: 'Histórico' },
  { path: '/achievements', icon: Trophy, labelEn: 'Achievements', labelPt: 'Conquistas' },
];

export default function AppLayout() {
  const { state, locale, equity, switchLocale, newGame, t } = useGame();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(loadTheme);
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
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => { if (confirm(locale === 'pt-BR' ? 'Iniciar novo jogo?' : 'Start new game?')) newGame(); }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {(!collapsed || mobileOpen) && <span>{locale === 'pt-BR' ? 'Novo Jogo' : 'New Game'}</span>}
        </Button>
      </div>
    </>
  );

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
            <span className={`regime-badge regime-${state.regime} shrink-0`}>
              {t(`regime.${state.regime}`)}
            </span>
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

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 scrollbar-terminal">
          <Outlet />
        </main>
      </div>

      <OnboardingTutorial />
    </div>
  );
}
