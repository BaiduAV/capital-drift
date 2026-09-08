import { toast } from 'sonner';

export function notifyBatchResult(result: { executed: number; rejected: number }, locale: 'pt-BR' | 'en'): void {
  const pt = locale === 'pt-BR';
  if (result.executed === 0) {
    toast.warning(pt ? 'Nenhuma operação executada. Verifique o caixa disponível e a liquidez dos ativos.'
      : 'No trades executed. Check available cash and asset liquidity.');
  } else if (result.rejected > 0) {
    toast.warning(pt ? `Execução parcial: ${result.executed} operações executadas e ${result.rejected} rejeitadas.`
      : `Partial execution: ${result.executed} trades executed and ${result.rejected} rejected.`);
  } else {
    toast.success(pt ? `${result.executed} operações executadas. Confira a alocação resultante.`
      : `${result.executed} trades executed. Review the resulting allocation.`);
  }
}
