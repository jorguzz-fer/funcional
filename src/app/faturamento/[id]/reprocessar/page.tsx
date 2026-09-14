import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ROLES_WRITE, type Role } from "@/lib/authz";
import UploadFaturamento from "@/components/Funcional/UploadFaturamento";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReprocessarFaturamentoPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const role = (session.user as { role?: string }).role as Role | undefined;
  if (!role || !ROLES_WRITE.includes(role)) redirect(`/faturamento/${id}`);

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    select: {
      id: true,
      dataInicio: true,
      dataFechamento: true,
      status: true,
      _count: {
        select: {
          pedidos: true,
          divergencias: { where: { resolvido: true } },
        },
      },
    },
  });

  if (!faturamento) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const periodo = `${fmt(faturamento.dataInicio)} — ${fmt(faturamento.dataFechamento)}`;
  // Datas são gravadas ao meio-dia UTC → o recorte ISO devolve o dia certo
  const toInput = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/faturamento/${id}`}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Substituir planilhas — {periodo}
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-8">
          Suba as planilhas corrigidas do Autorizador e do Proteus. A conciliação será refeita do zero,
          mantendo o mesmo faturamento. O período também pode ser ajustado.
        </p>
      </div>

      <UploadFaturamento
        modo="reprocessar"
        faturamentoId={id}
        periodoInicial={{
          dataInicio: toInput(faturamento.dataInicio),
          dataFim: toInput(faturamento.dataFechamento),
        }}
        resumoAtual={{
          pedidos: faturamento._count.pedidos,
          divergenciasResolvidas: faturamento._count.divergencias,
        }}
      />
    </div>
  );
}
