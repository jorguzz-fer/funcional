"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = "ADMIN" | "SUPERVISOR" | "ANALYST" | "VIEWER";

const ROLE_DESC: Record<Role, string> = {
  ADMIN:      "Acesso total + gestão de usuários",
  SUPERVISOR: "Aprova/exporta faturamentos + gerencia clínicas",
  ANALYST:    "Operação diária: upload, resolver divergências",
  VIEWER:     "Somente leitura — relatórios e dashboards",
};

export default function NovoUsuarioForm() {
  const router = useRouter();
  const [name, setName]         = React.useState("");
  const [email, setEmail]       = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole]         = React.useState<Role>("ANALYST");
  const [erro, setErro]         = React.useState<string | null>(null);
  const [saving, setSaving]     = React.useState(false);

  function gerarSenha() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$%";
    let s = "";
    for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setPassword(s);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (name.trim().length < 2)        return setErro("Nome muito curto");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro("E-mail inválido");
    if (password.length < 8)           return setErro("Senha precisa de pelo menos 8 caracteres");

    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data?.error ?? "Erro ao criar usuário");
        return;
      }
      router.push("/configuracoes/usuarios");
    } catch {
      setErro("Erro de rede");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] p-6 space-y-5"
    >
      {erro && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Nome completo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Ex.: Gabriela Silva"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="gabi@funcionalfarma.com.br"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Senha provisória <span className="text-gray-400 font-normal">(usuário troca no primeiro login)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Mínimo 8 caracteres"
          />
          <button
            type="button"
            onClick={gerarSenha}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#15203c] transition"
          >
            Gerar
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Papel
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(ROLE_DESC) as Role[]).map((r) => (
            <label
              key={r}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                role === r
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                  : "border-gray-200 dark:border-[#1e2d47] hover:bg-gray-50 dark:hover:bg-[#15203c]"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {r === "ADMIN" ? "Admin" : r === "SUPERVISOR" ? "Supervisor" : r === "ANALYST" ? "Analista" : "Leitor"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ROLE_DESC[r]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/configuracoes/usuarios"
          className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#15203c] transition"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Criando..." : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}
