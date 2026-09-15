// Types shared across the pipeline

export interface PedidoInput {
  voucher: string;
  articulacaoId?: string | null;
  /** "Pedido ID" do Autorizador — identificador reconhecido pela operação. */
  codigoPedido?: string | null;
  codigoPaciente: string;
  nomeExame?: string | null;
  dataInfusao?: Date | null;
  dataFinalizacaoVoucher?: Date | null;
  dataFaturamento?: Date | null;
  ageDias?: number | null;
  statusVoucher?: string | null;
  lote?: string | null;
  valorUnitario?: number | null;
  codigoOrdemPagamento?: string | null;
  statusOrdemPagamento?: string | null;
  cnpjClinica?: string | null;
  nomeClinica?: string | null;
  numeroNotaFiscal?: string | null;
  dsp?: string | null;
  tipo?: "EXAME" | "INFUSAO" | "APLICACAO";
  /**
   * Texto original da célula de valor quando ela NÃO pôde ser interpretada
   * como número (alerta VALOR_NAO_RECONHECIDO). Null quando o valor foi lido.
   */
  valorUnitarioBruto?: string | null;
  excluido: boolean;
  motivoExclusao?: string | null;
  alertas?: AlertaPedido[];
}

export type AlertaPedido = "LOTE_AUSENTE" | "VALOR_NAO_RECONHECIDO";

export interface OrdemInput {
  codigoOrdem?: string | null;
  numeroNotaFiscal?: string | null;
  valorTotal?: number | null;
  cnpj?: string | null;
  razaoSocial?: string | null;
  status?: string | null;
}

/**
 * Linha do Proteus descartada na limpeza porque a célula de valor tinha
 * conteúdo que não pôde ser interpretado como número.
 */
export interface LinhaProteusDescartada {
  /** Número da linha na planilha (1-based, contando a partir do cabeçalho). */
  linha: number;
  valorBruto: string;
  codigoOrdem: string | null;
  numeroNotaFiscal: string | null;
}

export interface LimparProteusResult {
  ordens: OrdemInput[];
  valoresNaoReconhecidos: LinhaProteusDescartada[];
}
