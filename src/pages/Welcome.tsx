import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, RotateCcw, TrendingUp, Shield, Zap } from 'lucide-react';

export default function Welcome() {
  const { state, locale, newGame, t } = useGame();
  const navigate = useNavigate();
  const [seed, setSeed] = useState('');

  const hasSave = state.dayIndex > 0;

  const handleNewGame = () => {
    const s = seed ? parseInt(seed) : Date.now();
    newGame(isNaN(s) ? Date.now() : s);
    navigate('/');
  };

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-wider text-primary terminal-glow font-sans">
            PATRIMÔNIO
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {locale === 'pt-BR'
              ? 'Simulador de investimentos no mercado brasileiro'
              : 'Brazilian market investment simulator'}
          </p>
        </div>

        {/* How to play */}
        <Card className="terminal-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-sans font-semibold text-foreground">
              {locale === 'pt-BR' ? 'Como Jogar' : 'How to Play'}
            </h2>
            <div className="space-y-2 text-xs font-mono text-muted-foreground">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {locale === 'pt-BR'
                    ? 'Você começa com R$ 5.000. Compre e venda ações, FIIs, renda fixa e cripto.'
                    : 'You start with R$ 5,000. Buy and sell stocks, REITs, bonds, and crypto.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-terminal-cyan shrink-0 mt-0.5" />
                <span>
                  {locale === 'pt-BR'
                    ? 'Seu objetivo: superar o CDI acumulado. Diversifique e gerencie riscos.'
                    : 'Your goal: beat the cumulative CDI. Diversify and manage risk.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-terminal-amber shrink-0 mt-0.5" />
                <span>
                  {locale === 'pt-BR'
                    ? 'O mercado muda de regime (calmo, bull, bear, crise). Adapte-se!'
                    : 'Markets shift regimes (calm, bull, bear, crisis). Adapt!'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {hasSave && (
            <Button onClick={handleContinue} className="w-full gap-2 font-mono" size="lg">
              <Play className="h-4 w-4" />
              {locale === 'pt-BR'
                ? `Continuar (Dia ${state.dayIndex})`
                : `Continue (Day ${state.dayIndex})`}
            </Button>
          )}

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={locale === 'pt-BR' ? 'Seed (opcional)' : 'Seed (optional)'}
              value={seed}
              onChange={e => setSeed(e.target.value)}
              className="text-xs font-mono flex-1"
              aria-label={locale === 'pt-BR' ? 'Semente da simulação' : 'Simulation seed'}
            />
            <Button onClick={handleNewGame} variant={hasSave ? 'secondary' : 'default'} className="gap-2 font-mono shrink-0">
              <RotateCcw className="h-4 w-4" />
              {locale === 'pt-BR' ? 'Novo Jogo' : 'New Game'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
