import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, ArrowLeftRight, Briefcase, Play } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { playRegimeSound } from '@/engine/audio';

const items = [
  { path: '/', icon: LayoutDashboard, labelEn: 'Home', labelPt: 'Painel' },
  { path: '/market', icon: TrendingUp, labelEn: 'Market', labelPt: 'Mercado' },
  { path: '/trade', icon: ArrowLeftRight, labelEn: 'Trade', labelPt: 'Negociar' },
  { path: '/portfolio', icon: Briefcase, labelEn: 'Portfolio', labelPt: 'Carteira' },
];

export default function BottomNav() {
  const { locale, advanceDay, t } = useGame();
  const location = useLocation();

  const handleAdvance = () => {
    const r = advanceDay();
    if (r.previousRegime !== r.regime) {
      playRegimeSound(r.regime);
      toast.warning(`⚡ Regime: ${t(`regime.${r.previousRegime}`)} → ${t(`regime.${r.regime}`)}`, { duration: 5000 });
    }
    if (r.dividendsPaid > 0 && r.metrics.dividendDetails.length > 0) {
      for (const d of r.metrics.dividendDetails) {
        toast.success(`💰 ${d.assetId}: +${new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(d.amount)}`, { duration: 4000 });
      }
    }
  };

  return (
    <>
      {/* FAB — Advance Day */}
      <button
        onClick={handleAdvance}
        className="fixed bottom-[4.5rem] right-4 z-50 md:hidden h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label={locale === 'pt-BR' ? 'Avançar dia' : 'Advance day'}
      >
        <Play className="h-5 w-5 ml-0.5" />
      </button>

      {/* Bottom navigation */}
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
    </>
  );
}
