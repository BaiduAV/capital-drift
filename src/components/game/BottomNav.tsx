import { useState, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, ArrowLeftRight, Briefcase, Play, FastForward } from 'lucide-react';
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

const LONG_PRESS_DURATION = 600; // ms to trigger fast-forward

export default function BottomNav() {
  const { locale, advanceDay, fastForward, t } = useGame();
  const location = useLocation();
  const [holdProgress, setHoldProgress] = useState(0); // 0-100
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const startTimeRef = useRef(0);
  const triggeredRef = useRef(false);

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

  const handleFastForward = useCallback(() => {
    const r = fastForward(7);
    toast.info(
      locale === 'pt-BR'
        ? `⏩ 7 dias avançados — Retorno: ${(r.totalReturn >= 0 ? '+' : '') + (r.totalReturn * 100).toFixed(2)}%`
        : `⏩ 7 days forwarded — Return: ${(r.totalReturn >= 0 ? '+' : '') + (r.totalReturn * 100).toFixed(2)}%`,
      { duration: 4000 }
    );
  }, [fastForward, locale]);

  const animateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
    setHoldProgress(progress);

    if (progress >= 100 && !triggeredRef.current) {
      triggeredRef.current = true;
      // Haptic feedback via Vibration API
      if (navigator.vibrate) navigator.vibrate(50);
      handleFastForward();
      setIsHolding(false);
      setHoldProgress(0);
      return;
    }

    if (progress < 100) {
      animRef.current = requestAnimationFrame(animateProgress);
    }
  }, [handleFastForward]);

  const startHold = useCallback(() => {
    triggeredRef.current = false;
    startTimeRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);
    animRef.current = requestAnimationFrame(animateProgress);
  }, [animateProgress]);

  const endHold = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;

    if (!triggeredRef.current) {
      // Short tap — advance 1 day
      handleAdvance();
    }

    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const cancelHold = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    triggeredRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  return (
    <>
      {/* FAB — Advance Day (tap) / Fast Forward 7d (long press) */}
      <div className="fixed bottom-[4.5rem] right-4 z-50 md:hidden">
        {/* Progress ring */}
        <svg
          className={cn(
            'absolute inset-0 -rotate-90 transition-opacity duration-150',
            isHolding ? 'opacity-100' : 'opacity-0'
          )}
          width="48"
          height="48"
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="hsl(var(--primary) / 0.2)"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - holdProgress / 100)}`}
            className="transition-none"
          />
        </svg>

        <button
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform select-none touch-none',
            isHolding ? 'scale-110' : 'active:scale-95'
          )}
          aria-label={locale === 'pt-BR' ? 'Toque: avançar dia / Segure: avançar 7 dias' : 'Tap: advance day / Hold: advance 7 days'}
        >
          {isHolding ? (
            <FastForward className="h-5 w-5 animate-pulse" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        {/* Hint label */}
        {isHolding && (
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground whitespace-nowrap shadow-md animate-fade-in">
            7d ⏩
          </div>
        )}
      </div>

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
