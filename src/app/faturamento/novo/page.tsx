import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UploadFaturamento from "@/components/Funcional/UploadFaturamento";

export default async function NovoFaturamentoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Faturamento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Suba as planilhas do Autorizador e Proteus para iniciar a conciliação
        </p>
      </div>
      <UploadFaturamento />
    </div>
  );
}
