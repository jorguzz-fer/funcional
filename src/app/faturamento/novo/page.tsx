import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import UploadFaturamento from "@/components/Funcional/UploadFaturamento";

export default async function NovoFaturamentoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Faturamentos já registrados — o formulário avisa quais sobrepõem o período
  // escolhido (vários podem coexistir: PSP, DSP, Remi Card…).
  const existentes = await prisma.faturamento.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, dataInicio: true, dataFechamento: true, programa: true, createdAt: true },
  });
  const toInput = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Faturamento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Suba as planilhas do Autorizador e Proteus para iniciar a conciliação
        </p>
      </div>
      <UploadFaturamento
        existentes={existentes.map((f) => ({
          id: f.id,
          dataInicio: toInput(f.dataInicio),
          dataFim: toInput(f.dataFechamento),
          programa: f.programa,
          criadoEm: f.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
