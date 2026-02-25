import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useGame } from '@/context/GameContext';
import { computeEquity } from '@/engine/invariants';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  ArrowLeftRight,
  Clock,
  Globe,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', labelEn: 'Dashboard', labelPt: 'Painel' },
  { path: '/market', icon: TrendingUp, labelKey: 'nav.market', labelEn: 'Market', labelPt: 'Mercado' },
  { path: '/portfolio', icon: Briefcase, labelKey: 'nav.portfolio', labelEn: 'Portfolio', labelPt: 'Carteira' },
  { path: '/trade', icon: ArrowLeftRight, labelKey: 'nav.trade', labelEn: 'Trade', labelPt: 'Negociar' },
  { path: '/history', icon: Clock, labelKey: 'nav.history', labelEn: 'History', labelPt: 'Histórico' },
];

export default function AppLayout() {
  const { state, locale, equity, switchLocale, newGame, t } = useGame();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);

  const formatPct = (val: number) =>
    (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + '%';

  const totalReturn = (equity - 5000) / 5000;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}>
        {/* Logo */}
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
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav links */}
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
              {!collapsed && <span>{locale === 'pt-BR' ? item.labelPt : item.labelEn}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-border p-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={switchLocale}
          >
            <Globe className="h-3.5 w-3.5" />
            {!collapsed && <span>{locale === 'pt-BR' ? 'EN' : 'PT'}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => { if (confirm(locale === 'pt-BR' ? 'Iniciar novo jogo?' : 'Start new game?')) newGame(); }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {!collapsed && <span>{locale === 'pt-BR' ? 'Novo Jogo' : 'New Game'}</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2 bg-card">
          <div className="flex items-center gap-4">
            <span className={`regime-badge regime-${state.regime}`}>
              {t(`regime.${state.regime}`)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {locale === 'pt-BR' ? 'DIA' : 'DAY'} {state.dayIndex}
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">{locale === 'pt-BR' ? 'SELIC' : 'RATE'}: </span>
              <span className="text-terminal-cyan">{(state.macro.baseRateAnnual * 100).toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">IPCA: </span>
              <span className="text-terminal-amber">{(state.macro.inflationAnnual * 100).toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">{locale === 'pt-BR' ? 'PATRIMÔNIO' : 'EQUITY'}: </span>
              <span className="text-foreground terminal-glow">{formatCurrency(equity)}</span>
            </div>
            <span className={totalReturn >= 0 ? 'price-up' : 'price-down'}>
              {formatPct(totalReturn)}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 scrollbar-terminal">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
