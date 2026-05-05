"use strict";
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const EMAIL = process.env.ADMIN_EMAIL || "admin@funcionalfarma.com.br";
const SENHA = process.env.ADMIN_PASS  || "Funcional@2026";

async function main() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(SENHA, 12);
    const user = await prisma.user.upsert({
      where:  { email: EMAIL },
      update: {},
      create: { name: "Administrador", email: EMAIL, passwordHash: hash, role: "ADMIN", active: true },
    });
    console.log("Admin pronto:", user.email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
