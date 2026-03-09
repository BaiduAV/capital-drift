import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, ArrowLeftRight, Briefcase } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

const items = [
  { path: '/', icon: LayoutDashboard, labelEn: 'Home', labelPt: 'Painel' },
  { path: '/market', icon: TrendingUp, labelEn: 'Market', labelPt: 'Mercado' },
  { path: '/trade', icon: ArrowLeftRight, labelEn: 'Trade', labelPt: 'Negociar' },
  { path: '/portfolio', icon: Briefcase, labelEn: 'Portfolio', labelPt: 'Carteira' },
];

export default function BottomNav() {
  const { locale } = useGame();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-stretch h-14">
        {items.map((item) => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_hsl(var(--terminal-green)/0.5)]')} />
              <span className="truncate">{locale === 'pt-BR' ? item.labelPt : item.labelEn}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
