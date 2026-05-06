"use client";

import React from "react";

type Role = "ADMIN" | "SUPERVISOR" | "ANALYST" | "VIEWER";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN:      "Admin",
  SUPERVISOR: "Supervisor",
  ANALYST:    "Analista",
  VIEWER:     "Leitor",
};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  SUPERVISOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ANALYST:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  VIEWER:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

interface Props {
  initial: Usuario[];
  currentUserId: string;
}

export default function UsuariosTable({ initial, currentUserId }: Props) {
  const [usuarios, setUsuarios] = React.useState(initial);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  async function patch(id: string, body: Partial<Pick<Usuario, "role" | "active"> & { password: string }>) {
    setSavingId(id);
    setErro(null);
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data?.error ?? "Erro ao salvar");
        return false;
      }
      if (data.usuario) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ...data.usuario } : u)),
        );
      }
      return true;
    } catch {
      setErro("Erro de rede");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function desativar(u: Usuario) {
    if (!confirm(`Desativar ${u.name}? O usuário perderá acesso imediatamente.`)) return;
    setSavingId(u.id);
    setErro(null);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErro(data?.error ?? "Erro ao desativar");
        return;
      }
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: false } : x)),
      );
    } finally {
      setSavingId(null);
    }
  }

  async function resetarSenha(u: Usuario) {
    const nova = prompt(`Nova senha para ${u.name} (mín. 8 caracteres):`);
    if (!nova) return;
    if (nova.length < 8) {
      alert("Senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    const ok = await patch(u.id, { password: nova });
    if (ok) alert("Senha redefinida.");
  }

  return (
    <>
      {erro && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
              <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Nome</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">E-mail</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Papel</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-6 py-4 text-right font-semibold text-gray-600 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const isSelf = u.id === currentUserId;
              const saving = savingId === u.id;

              return (
                <tr
                  key={u.id}
                  className={`border-b border-gray-50 dark:border-[#1a2540] transition ${
                    !u.active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      disabled={saving || !u.active || isSelf}
                      onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer ${ROLE_BADGE[u.role]} disabled:cursor-not-allowed`}
                    >
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Desativado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => resetarSenha(u)}
                        disabled={saving || !u.active}
                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#15203c] dark:hover:bg-[#1c2a4d] text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Resetar senha
                      </button>
                      {u.active && !isSelf && (
                        <button
                          onClick={() => desativar(u)}
                          disabled={saving}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Desativar
                        </button>
                      )}
                      {!u.active && (
                        <button
                          onClick={() => patch(u.id, { active: true })}
                          disabled={saving}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
