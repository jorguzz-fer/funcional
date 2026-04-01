export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface FaturamentoBatch {
  id: string;
  periodo: string;
  status: string;
  totalRegistrosOriginal: number | null;
  totalTrabalhada: number | null;
  totalVazias: number | null;
  totalForaAging: number | null;
  totalExcluidas: number | null;
  valorTotalFaturar: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationResult {
  id: string;
  batchId: string;
  numNotaFiscal: string | null;
  voucher: number | null;
  codOrdemPagamento: number | null;
  status: string;
  valorAutorizador: number | null;
  valorProteus: number | null;
  bateValor: boolean | null;
  cnpjAutorizador: string | null;
  cnpjProteus: string | null;
  bateCnpj: boolean | null;
  razaoAutorizador: string | null;
  razaoProteus: string | null;
  bateRazao: boolean | null;
  observacao: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ReconciliationSummary {
  batch: FaturamentoBatch;
  statusCounts: Record<string, number>;
  classificacaoCounts: Record<string, number>;
  topClinicas: Array<{ nome: string; count: number }>;
}

export interface UploadSummary {
  totalOriginal: number;
  totalTrabalhada: number;
  totalVazias: number;
  totalForaAging: number;
  totalExcluidas: number;
  valorTotalFaturar: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
