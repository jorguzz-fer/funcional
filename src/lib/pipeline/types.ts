// Types shared across the pipeline

export interface PedidoInput {
  voucher: string;
  articulacaoId?: string | null;
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
  excluido: boolean;
  motivoExclusao?: string | null;
  alertas?: string[];
}

export interface OrdemInput {
  codigoOrdem?: string | null;
  numeroNotaFiscal?: string | null;
  valorTotal?: number | null;
  cnpj?: string | null;
  razaoSocial?: string | null;
  status?: string | null;
}
