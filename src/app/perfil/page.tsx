import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import PerfilForm from "@/components/Funcional/PerfilForm";

const ROLE_LABEL: Record<string, string> = {
  ADMIN:      "Admin",
  SUPERVISOR: "Supervisor",
  ANALYST:    "Analista",
  VIEWER:     "Leitor",
};

export default async function PerfilPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Atualize seus dados pessoais e senha de acesso
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-[#1e2d47]">
            <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
              <div className="mt-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>
            </div>
          </div>

          <PerfilForm initialName={user.name} email={user.email} />
        </div>
      </div>
    </div>
  );
}
