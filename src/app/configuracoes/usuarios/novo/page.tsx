import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NovoUsuarioForm from "@/components/Funcional/NovoUsuarioForm";

export default async function NovoUsuarioPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Usuário</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Crie um acesso para alguém da equipe Funcional ou J&amp;J
        </p>
      </div>

      <div className="max-w-2xl">
        <NovoUsuarioForm />
      </div>
    </div>
  );
}
