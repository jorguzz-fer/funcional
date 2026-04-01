import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@funcional.com";

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log(`Usuário ${email} já existe.`);
    return;
  }

  const hashedPassword = await bcrypt.hash("funcional2026", 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: "Administrador",
      role: "admin",
    },
  });

  console.log(`✅ Usuário criado: ${email} / funcional2026`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
