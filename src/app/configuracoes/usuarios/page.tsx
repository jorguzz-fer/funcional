import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import UsuariosTable from "@/components/Funcional/UsuariosTable";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const usuarios = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  const initial = usuarios.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-[25px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Controle quem tem acesso ao sistema e em qual nível
          </p>
        </div>
        <Link
          href="/configuracoes/usuarios/novo"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Novo Usuário
        </Link>
      </div>

      <UsuariosTable initial={initial} currentUserId={session.user.id} />
    </div>
  );
}
