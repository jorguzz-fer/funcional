import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DashboardKPIs from "@/components/Funcional/DashboardKPIs";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const [totalFaturamentos, faturamentoAtual, totalDivergencias] = await Promise.all([
    prisma.faturamento.count(),
    prisma.faturamento.findFirst({
      where: { mesReferencia: mes, anoReferencia: ano },
      include: {
        _count: {
          select: {
            pedidos: true,
            divergencias: { where: { resolvido: false } },
          },
        },
      },
    }),
    prisma.divergencia.count({ where: { resolvido: false } }),
  ]);

  return (
    <DashboardKPIs
      totalFaturamentos={totalFaturamentos}
      faturamentoAtual={faturamentoAtual}
      totalDivergenciasPendentes={totalDivergencias}
      mes={mes}
      ano={ano}
    />
  );
}
