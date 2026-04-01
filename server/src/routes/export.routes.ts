import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { formatCnpj } from "../utils/cnpj.js";
import { formatDateBR } from "../utils/dates.js";

const router = Router();
const prisma = new PrismaClient();

// GET /api/export/:batchId/externos
router.get("/:batchId/externos", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.faturamentoBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      res.status(404).json({ error: "Batch não encontrado" });
      return;
    }

    // Busca registros trabalhados
    const records = await prisma.autorizadorRecord.findMany({
      where: { batchId, classificacao: "trabalhada" },
      orderBy: [{ mesReferencia: "asc" }, { nomeDaClinica: "asc" }],
    });

    const workbook = new ExcelJS.Workbook();

    // === Aba Clínicas e Laboratórios ===
    const sheet = workbook.addWorksheet("Clínicas e Laboratórios");

    // Linha 1 - total
    const valorTotal = records.reduce((sum, r) => sum + Number(r.valor), 0);
    sheet.getCell("O1").value = valorTotal;
    sheet.getCell("O1").numFmt = "#,##0.00";

    // Linha 2 - JANSSEN
    sheet.getCell("R2").value = "JANSSEN";

    // Linha 3 - Headers
    const headers = [
      "Serviço", "Data Envio Janssen", "Mês Referente", "Nome da Clinica",
      "CNPJ ", "CIDADE", "UF", "Prazo de Pagamento", "Nº Nota Fiscal",
      "Data do Envio NF", "Data Utilização", "Código Paciente", "Voucher",
      "Lote", "Valor", "Acréscimo 6%", "Valor Líquido", "PO", "PO 6%",
      "Produto", "Arquivo/ Tipo do Gasto", "Nome da Clinica Utilização",
      "CNPJ Utilização",
    ];

    const headerRow = sheet.getRow(3);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
      headerRow.getCell(i + 1).font = { bold: true };
    });

    // Dados a partir da linha 4
    let rowNum = 4;
    for (const r of records) {
      // Filtra visitas para aba separada
      if (r.servico.toLowerCase().includes("visita")) continue;

      const row = sheet.getRow(rowNum);
      row.getCell(1).value = r.servico;
      row.getCell(2).value = r.dataEnvioJanssen;
      row.getCell(3).value = r.mesReferencia ? Number(r.mesReferencia) || r.mesReferencia : "";
      row.getCell(4).value = r.nomeDaClinica;
      row.getCell(5).value = r.cnpjFaturamento ? formatCnpj(r.cnpjFaturamento) : "";
      row.getCell(6).value = r.cidade;
      row.getCell(7).value = r.uf;
      row.getCell(8).value = r.prazoPagamento;
      row.getCell(9).value = r.numNotaFiscal ? Number(r.numNotaFiscal) || r.numNotaFiscal : "";
      row.getCell(10).value = r.dataEnvioNF;
      row.getCell(11).value = r.dataUtilizacao;
      row.getCell(12).value = r.codigoPaciente;
      row.getCell(13).value = r.voucher;
      row.getCell(14).value = r.lote;
      row.getCell(15).value = Number(r.valor);
      row.getCell(15).numFmt = "#,##0.00";
      // Colunas 16-19 (Acréscimo, Valor Líquido, PO, PO 6%) vazias por default
      row.getCell(20).value = r.procedimentoReclassificacao;
      row.getCell(21).value = r.dspPsp;
      row.getCell(22).value = r.nomeFantasia || r.nomeDaClinica;
      row.getCell(23).value = r.cnpjCredenciado ? formatCnpj(r.cnpjCredenciado) : "";
      rowNum++;
    }

    // === Aba Visitas ===
    const visitas = records.filter((r) =>
      r.servico.toLowerCase().includes("visita")
    );

    if (visitas.length > 0) {
      const visitasSheet = workbook.addWorksheet("Visitas");
      const visitaHeaders = [
        "Serviço", "Programa RC", "Data Envio Janssen", "Mês Referente",
        "Nome da Clinica", "CNPJ", "CIDADE", "UF", "PRAZO DE PAGAMENTO",
        "Nº Nota Fiscal", "Data do Envio NF", "Data Utilização",
        "Código Paciente", "Voucher", "Valor", " Acréscimo 6%",
        "Valor Líquido", "PO", "PO 6%", "Produto", "Serviço_Detalhado",
        "Arquivo/ Tipo do Gasto", "Obs Janssen",
      ];

      // Linha 1 - valor total visitas
      const valorVisitas = visitas.reduce((sum, r) => sum + Number(r.valor), 0);
      visitasSheet.getCell("O1").value = valorVisitas;

      // Linha 2
      visitasSheet.getCell("R2").value = "JANSSEN";

      // Linha 3 - headers
      const vHeaderRow = visitasSheet.getRow(3);
      visitaHeaders.forEach((h, i) => {
        vHeaderRow.getCell(i + 1).value = h;
        vHeaderRow.getCell(i + 1).font = { bold: true };
      });

      let vRowNum = 4;
      for (const r of visitas) {
        const row = visitasSheet.getRow(vRowNum);
        row.getCell(1).value = r.servico;
        row.getCell(2).value = r.procedimentoReclassificacao;
        row.getCell(3).value = r.dataEnvioJanssen;
        row.getCell(4).value = r.mesReferencia ? Number(r.mesReferencia) || r.mesReferencia : "";
        row.getCell(5).value = r.nomeDaClinica;
        row.getCell(6).value = r.cnpjFaturamento ? formatCnpj(r.cnpjFaturamento) : "";
        row.getCell(7).value = r.cidade;
        row.getCell(8).value = r.uf;
        row.getCell(9).value = r.prazoPagamento;
        row.getCell(10).value = r.numNotaFiscal ? Number(r.numNotaFiscal) || r.numNotaFiscal : "";
        row.getCell(11).value = r.dataEnvioNF;
        row.getCell(12).value = r.dataUtilizacao;
        row.getCell(13).value = r.codigoPaciente;
        row.getCell(14).value = r.voucher;
        row.getCell(15).value = Number(r.valor);
        row.getCell(15).numFmt = "#,##0.00";
        row.getCell(20).value = r.procedimentoReclassificacao;
        row.getCell(21).value = r.nomeExame;
        row.getCell(22).value = r.dspPsp;
        vRowNum++;
      }
    }

    // Gera o buffer e envia
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Externos_Clinicas_${batch.periodo}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Erro ao exportar arquivo" });
  }
});

// GET /api/export/:batchId/divergencias
router.get("/:batchId/divergencias", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const results = await prisma.reconciliationResult.findMany({
      where: {
        batchId,
        status: { not: "consistente" },
      },
      orderBy: { status: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Divergências");

    // Headers
    const headers = [
      "NF", "Voucher", "Ordem Pgto", "Status",
      "Valor Autorizador", "Valor Proteus", "Bate Valor",
      "CNPJ Autorizador", "CNPJ Proteus", "Bate CNPJ",
      "Razão Autorizador", "Razão Proteus", "Bate Razão",
      "Observação",
    ];

    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
      headerRow.getCell(i + 1).font = { bold: true };
      headerRow.getCell(i + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
    });

    let rowNum = 2;
    for (const r of results) {
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = r.numNotaFiscal;
      row.getCell(2).value = r.voucher;
      row.getCell(3).value = r.codOrdemPagamento;
      row.getCell(4).value = r.status;
      row.getCell(5).value = r.valorAutorizador ? Number(r.valorAutorizador) : "";
      row.getCell(6).value = r.valorProteus ? Number(r.valorProteus) : "";
      row.getCell(7).value = r.bateValor === null ? "" : r.bateValor ? "SIM" : "NÃO";
      row.getCell(8).value = r.cnpjAutorizador ? formatCnpj(r.cnpjAutorizador) : "";
      row.getCell(9).value = r.cnpjProteus ? formatCnpj(r.cnpjProteus) : "";
      row.getCell(10).value = r.bateCnpj === null ? "" : r.bateCnpj ? "SIM" : "NÃO";
      row.getCell(11).value = r.razaoAutorizador;
      row.getCell(12).value = r.razaoProteus;
      row.getCell(13).value = r.bateRazao === null ? "" : r.bateRazao ? "SIM" : "NÃO";
      row.getCell(14).value = r.observacao;

      // Highlight divergências
      const redFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };

      if (r.bateValor === false) {
        row.getCell(5).fill = redFill;
        row.getCell(6).fill = redFill;
      }
      if (r.bateCnpj === false) {
        row.getCell(8).fill = redFill;
        row.getCell(9).fill = redFill;
      }
      if (r.bateRazao === false) {
        row.getCell(11).fill = redFill;
        row.getCell(12).fill = redFill;
      }

      rowNum++;
    }

    // Auto-fit columns
    sheet.columns.forEach((col) => {
      col.width = 20;
    });

    const batch = await prisma.faturamentoBatch.findUnique({ where: { id: batchId } });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Divergencias_${batch?.periodo || batchId}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export divergencias error:", error);
    res.status(500).json({ error: "Erro ao exportar divergências" });
  }
});

export { router as exportRoutes };
