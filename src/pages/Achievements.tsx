import { useGame } from '@/context/GameContext';
import { ACHIEVEMENT_DEFS } from '@/engine/achievements';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Achievements() {
  const { state, t } = useGame();
  const achievements = state.achievements ?? {};
  const unlockedCount = Object.keys(achievements).length;
  const total = ACHIEVEMENT_DEFS.length;
  const pct = Math.round((unlockedCount / total) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
          🏆 {t('achievements.title')}
        </h1>
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2.5 flex-1" />
          <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
            {t('achievements.progress', { unlocked: String(unlockedCount), total: String(total) })}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACHIEVEMENT_DEFS.map((def) => {
          const unlock = achievements[def.id];
          const isUnlocked = !!unlock;

          return (
            <Card
              key={def.id}
              className={cn(
                'transition-all duration-300',
                isUnlocked
                  ? 'border-primary/40 bg-primary/5 shadow-md'
                  : 'opacity-60 grayscale border-border bg-muted/30'
              )}
            >
              <CardContent className="p-4 flex gap-3 items-start">
                <span className="text-2xl shrink-0" role="img" aria-hidden>
                  {isUnlocked ? def.icon : '🔒'}
                </span>
                <div className="min-w-0 space-y-1">
                  <h3 className="text-sm font-semibold font-mono text-foreground truncate">
                    {t(def.titleKey)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isUnlocked ? t(def.descKey) : t(def.hintKey)}
                  </p>
                  {isUnlocked && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {t('achievements.unlocked_at', { day: String(unlock.unlockedAtDay) })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
