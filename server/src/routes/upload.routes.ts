import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { processAutorizador } from "../services/autorizadorProcessor.js";
import { processProteus } from "../services/proteusProcessor.js";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Use absolute path for Docker container (/app/uploads) or fallback for local dev
const uploadsDir = path.resolve(process.cwd(), "uploads");
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos Excel (.xlsx, .xls) são aceitos"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// POST /api/upload/autorizador
router.post(
  "/autorizador",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }

      const { periodo } = req.body;
      if (!periodo) {
        res.status(400).json({ error: "Período é obrigatório (ex: 2026-03)" });
        return;
      }

      // Busca ou cria batch
      let batch = await prisma.faturamentoBatch.findFirst({
        where: { periodo, uploadedBy: req.user!.userId },
        orderBy: { createdAt: "desc" },
      });

      if (!batch) {
        batch = await prisma.faturamentoBatch.create({
          data: {
            periodo,
            dataExtracaoAut: new Date(),
            uploadedBy: req.user!.userId,
            status: "processando",
          },
        });
      } else {
        // Limpa registros anteriores do autorizador
        await prisma.autorizadorRecord.deleteMany({ where: { batchId: batch.id } });
        await prisma.faturamentoBatch.update({
          where: { id: batch.id },
          data: { status: "processando", dataExtracaoAut: new Date() },
        });
      }

      const result = await processAutorizador(req.file.path, batch.id);

      await prisma.faturamentoBatch.update({
        where: { id: batch.id },
        data: {
          totalRegistrosOriginal: result.totalOriginal,
          totalTrabalhada: result.totalTrabalhada,
          totalVazias: result.totalVazias,
          totalForaAging: result.totalForaAging,
          totalExcluidas: result.totalExcluidas,
          valorTotalFaturar: result.valorTotalFaturar,
          status: batch.dataExtracaoPro ? "curadoria_completa" : "aguardando_proteus",
        },
      });

      res.json({
        batchId: batch.id,
        summary: result,
      });
    } catch (error) {
      console.error("Upload autorizador error:", error);
      res.status(500).json({ error: "Erro ao processar arquivo do Autorizador" });
    }
  }
);

// POST /api/upload/proteus
router.post(
  "/proteus",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }

      const { batchId } = req.body;
      if (!batchId) {
        res.status(400).json({ error: "batchId é obrigatório" });
        return;
      }

      const batch = await prisma.faturamentoBatch.findUnique({ where: { id: batchId } });
      if (!batch) {
        res.status(404).json({ error: "Batch não encontrado" });
        return;
      }

      // Limpa registros anteriores do proteus
      await prisma.proteusRecord.deleteMany({ where: { batchId } });

      const result = await processProteus(req.file.path, batchId);

      await prisma.faturamentoBatch.update({
        where: { id: batchId },
        data: {
          dataExtracaoPro: new Date(),
          status: "curadoria_completa",
        },
      });

      res.json({
        batchId,
        summary: result,
      });
    } catch (error) {
      console.error("Upload proteus error:", error);
      res.status(500).json({ error: "Erro ao processar arquivo do Proteus" });
    }
  }
);

// GET /api/upload/batches
router.get("/batches", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const batches = await prisma.faturamentoBatch.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        periodo: true,
        status: true,
        totalRegistrosOriginal: true,
        totalTrabalhada: true,
        totalVazias: true,
        totalForaAging: true,
        totalExcluidas: true,
        valorTotalFaturar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ batches });
  } catch (error) {
    console.error("List batches error:", error);
    res.status(500).json({ error: "Erro ao listar batches" });
  }
});

export { router as uploadRoutes };
