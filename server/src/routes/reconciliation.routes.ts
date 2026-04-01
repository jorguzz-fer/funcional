import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { runReconciliation } from "../services/reconciliationEngine.js";

const router = Router();
const prisma = new PrismaClient();

// POST /api/reconciliation/:batchId/run
router.post("/:batchId/run", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.faturamentoBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      res.status(404).json({ error: "Batch não encontrado" });
      return;
    }

    if (!batch.dataExtracaoPro) {
      res.status(400).json({ error: "Arquivo do Proteus ainda não foi enviado" });
      return;
    }

    const summary = await runReconciliation(batchId);

    res.json({ summary });
  } catch (error) {
    console.error("Reconciliation error:", error);
    res.status(500).json({ error: "Erro ao executar conciliação" });
  }
});

// GET /api/reconciliation/:batchId/results
router.get("/:batchId/results", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { status, page = "1", limit = "50" } = req.query;

    const where: Record<string, unknown> = { batchId };
    if (status && status !== "todos") {
      where.status = status;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [results, total] = await Promise.all([
      prisma.reconciliationResult.findMany({
        where,
        orderBy: { status: "asc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.reconciliationResult.count({ where }),
    ]);

    res.json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Results error:", error);
    res.status(500).json({ error: "Erro ao buscar resultados" });
  }
});

// GET /api/reconciliation/:batchId/summary
router.get("/:batchId/summary", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.faturamentoBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      res.status(404).json({ error: "Batch não encontrado" });
      return;
    }

    // Contagens por status
    const statusCounts = await prisma.reconciliationResult.groupBy({
      by: ["status"],
      where: { batchId },
      _count: true,
    });

    // Contagens por classificação do autorizador
    const classificacaoCounts = await prisma.autorizadorRecord.groupBy({
      by: ["classificacao"],
      where: { batchId },
      _count: true,
    });

    // Top clínicas com divergências
    const topDivergentes = await prisma.reconciliationResult.findMany({
      where: {
        batchId,
        status: { startsWith: "divergente" },
      },
      select: {
        razaoAutorizador: true,
        cnpjAutorizador: true,
        status: true,
      },
    });

    // Agrupa por clínica
    const clinicaMap = new Map<string, number>();
    for (const d of topDivergentes) {
      const key = d.razaoAutorizador || d.cnpjAutorizador || "Desconhecido";
      clinicaMap.set(key, (clinicaMap.get(key) || 0) + 1);
    }

    const topClinicas = Array.from(clinicaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, count]) => ({ nome, count }));

    res.json({
      batch,
      statusCounts: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count])
      ),
      classificacaoCounts: Object.fromEntries(
        classificacaoCounts.map((c) => [c.classificacao, c._count])
      ),
      topClinicas,
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: "Erro ao gerar resumo" });
  }
});

// PATCH /api/reconciliation/:id/resolve
router.patch("/:id/resolve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { observacao } = req.body;

    const result = await prisma.reconciliationResult.update({
      where: { id },
      data: {
        observacao,
        resolvedAt: new Date(),
        resolvedBy: req.user!.userId,
        status: "resolvido",
      },
    });

    res.json({ result });
  } catch (error) {
    console.error("Resolve error:", error);
    res.status(500).json({ error: "Erro ao resolver divergência" });
  }
});

export { router as reconciliationRoutes };
