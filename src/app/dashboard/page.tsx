import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DashboardKPIs from "@/components/Funcional/DashboardKPIs";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [totalFaturamentos, faturamentoAtual, totalDivergencias] = await Promise.all([
    prisma.faturamento.count(),
    prisma.faturamento.findFirst({
      orderBy: { dataInicio: "desc" },
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

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const periodo = faturamentoAtual
    ? `${fmt(faturamentoAtual.dataInicio)} — ${fmt(faturamentoAtual.dataFechamento)}`
    : "";

  return (
    <DashboardKPIs
      totalFaturamentos={totalFaturamentos}
      faturamentoAtual={faturamentoAtual}
      totalDivergenciasPendentes={totalDivergencias}
      periodo={periodo}
    />
  );
}
