import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

function generateToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });

    if (exists) {
      res.status(400).json({ error: "Email já cadastrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message });
      return;
    }
    console.error("Register error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message });
      return;
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export { router as authRoutes };
