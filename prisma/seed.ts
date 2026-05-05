import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Funcional@2026", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@funcionalfarma.com.br" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@funcionalfarma.com.br",
      passwordHash: hash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("✓ Admin criado:", admin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
