import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, TrendingUp, ShoppingCart, BarChart3, Shield, Zap, Calendar, Coins, Target } from 'lucide-react';

interface TutorialStep {
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
  icon: React.ReactNode;
  highlight?: string; // CSS selector hint (visual only)
}

const steps: TutorialStep[] = [
  {
    titlePt: 'Bem-vindo ao Patrimônio!',
    titleEn: 'Welcome to Patrimônio!',
    descPt: 'Você é um investidor com R$ 5.000 no mercado brasileiro. Seu objetivo é construir uma carteira que supere o CDI acumulado — o benchmark da renda fixa. Vamos aprender como funciona!',
    descEn: 'You\'re an investor with R$ 5,000 in the Brazilian market. Your goal is to build a portfolio that beats the accumulated CDI — the fixed income benchmark. Let\'s learn how it works!',
    icon: <Target className="h-6 w-6" />,
  },
  {
    titlePt: 'Painel de Controle',
    titleEn: 'Dashboard',
    descPt: 'O Dashboard é seu centro de comando. Aqui você vê seu patrimônio, o gráfico de performance (comparado ao CDI), o regime de mercado atual e as últimas notícias. Use os botões "Avançar Dia" ou "7d" para simular o tempo.',
    descEn: 'The Dashboard is your command center. Here you see your equity, performance chart (vs CDI), current market regime, and latest news. Use "Next Day" or "7d" buttons to simulate time.',
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    titlePt: 'Indicadores Macro',
    titleEn: 'Macro Indicators',
    descPt: 'SELIC (juros) — alta favorece renda fixa, baixa favorece ações. IPCA (inflação) — corrói seu poder de compra. USD/BRL — sobe em crises. Risco — mede o medo do mercado. Passe o mouse sobre cada indicador para mais detalhes!',
    descEn: 'SELIC (interest rate) — high favors bonds, low favors stocks. IPCA (inflation) — erodes purchasing power. USD/BRL — rises in crises. Risk — measures market fear. Hover over each indicator for details!',
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    titlePt: 'Regimes de Mercado',
    titleEn: 'Market Regimes',
    descPt: 'O mercado alterna entre regimes: Calmo (normal), Bull (alta), Bear (queda), Crise (pânico) e Euforia Crypto. Cada regime afeta os retornos dos ativos de forma diferente. Adapte sua estratégia!',
    descEn: 'Markets alternate between regimes: Calm (normal), Bull (up), Bear (down), Crisis (panic), and Crypto Euphoria. Each regime affects asset returns differently. Adapt your strategy!',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    titlePt: 'Classes de Ativos',
    titleEn: 'Asset Classes',
    descPt: 'Renda Fixa (Tesouro, CDB, Debêntures) — estável, rende próximo ao CDI. Ações — maior retorno potencial, maior risco. FIIs — pagam dividendos mensais. Crypto — altíssima volatilidade. Dólar — proteção contra crises.',
    descEn: 'Fixed Income (Treasury, CDB, Debentures) — stable, yields near CDI. Stocks — higher potential return, higher risk. REITs — pay monthly dividends. Crypto — extreme volatility. USD — crisis hedge.',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    titlePt: 'Comprando e Vendendo',
    titleEn: 'Buying and Selling',
    descPt: 'Na tela de Negociação, selecione um ativo, defina a quantidade (use os botões de %) e clique para executar. O botão MAX calcula quantas cotas você pode comprar com seu caixa atual. A cotação atualiza em tempo real!',
    descEn: 'On the Trading screen, select an asset, set the quantity (use % buttons) and click to execute. The MAX button calculates how many shares you can afford. The quote updates in real-time!',
    icon: <ShoppingCart className="h-6 w-6" />,
  },
  {
    titlePt: 'Dividendos',
    titleEn: 'Dividends',
    descPt: 'FIIs pagam dividendos mensais e ações trimestrais — cada ativo tem sua própria data. O calendário de dividendos no Dashboard mostra os próximos pagamentos e quanto você receberá. Dividendos caem direto no seu caixa!',
    descEn: 'REITs pay monthly dividends and stocks quarterly — each asset has its own schedule. The dividend calendar on the Dashboard shows upcoming payments and your expected income. Dividends go straight to cash!',
    icon: <Calendar className="h-6 w-6" />,
  },
  {
    titlePt: 'Dica Final: Diversifique!',
    titleEn: 'Final Tip: Diversify!',
    descPt: 'Não coloque tudo em um único ativo. Misture renda fixa (proteção), ações (crescimento), FIIs (renda) e talvez um pouco de crypto (especulação). Monitore o drawdown — acima de 10% é preocupante. Boa sorte! 🚀',
    descEn: 'Don\'t put everything in one asset. Mix fixed income (protection), stocks (growth), REITs (income), and maybe some crypto (speculation). Monitor drawdown — above 10% is concerning. Good luck! 🚀',
    icon: <Coins className="h-6 w-6" />,
  },
];

const TUTORIAL_STORAGE_KEY = 'patrimonio_tutorial_done';

export default function OnboardingTutorial() {
  const { locale } = useGame();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!done) {
      // Show tutorial on first visit after a short delay
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Allow reopening from outside
  useEffect(() => {
    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener('patrimonio:open-tutorial', handler);
    return () => window.removeEventListener('patrimonio:open-tutorial', handler);
  }, []);

  if (!open) return null;

  const current = steps[step];
  const isPt = locale === 'pt-BR';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-fade-in">
        <div className="terminal-card border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label={isPt ? 'Fechar tutorial' : 'Close tutorial'}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Icon + Step counter */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                {current.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {step + 1} / {steps.length}
                </div>
                <h3 className="text-base font-sans font-bold text-foreground leading-tight">
                  {isPt ? current.titlePt : current.titleEn}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isPt ? current.descPt : current.descEn}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-mono gap-1"
                onClick={handlePrev}
                disabled={step === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {isPt ? 'Anterior' : 'Previous'}
              </Button>

              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === step ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>

              <Button
                size="sm"
                className="text-xs font-mono gap-1"
                onClick={handleNext}
              >
                {step === steps.length - 1
                  ? (isPt ? 'Começar!' : 'Start!')
                  : (isPt ? 'Próximo' : 'Next')
                }
                {step < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Call this to reopen the tutorial from anywhere */
export function openTutorial() {
  window.dispatchEvent(new Event('patrimonio:open-tutorial'));
}
