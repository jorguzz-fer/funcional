"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialName: string;
  email: string;
}

export default function PerfilForm({ initialName, email }: Props) {
  const router = useRouter();

  // Aba Dados
  const [name, setName] = React.useState(initialName);
  const [savingName, setSavingName] = React.useState(false);
  const [nameMsg, setNameMsg] = React.useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Aba Senha
  const [senhaAtual, setSenhaAtual]   = React.useState("");
  const [novaSenha, setNovaSenha]     = React.useState("");
  const [confirmarSenha, setConfirmarSenha] = React.useState("");
  const [savingSenha, setSavingSenha] = React.useState(false);
  const [senhaMsg, setSenhaMsg]       = React.useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    if (name.trim().length < 2) {
      setNameMsg({ tipo: "erro", texto: "Nome muito curto" });
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameMsg({ tipo: "erro", texto: data?.error ?? "Erro ao salvar" });
        return;
      }
      setNameMsg({ tipo: "ok", texto: "Nome atualizado." });
      router.refresh();
    } catch {
      setNameMsg({ tipo: "erro", texto: "Erro de rede" });
    } finally {
      setSavingName(false);
    }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setSenhaMsg(null);

    if (!senhaAtual)             return setSenhaMsg({ tipo: "erro", texto: "Informe a senha atual" });
    if (novaSenha.length < 8)    return setSenhaMsg({ tipo: "erro", texto: "Nova senha precisa ter ao menos 8 caracteres" });
    if (novaSenha !== confirmarSenha) return setSenhaMsg({ tipo: "erro", texto: "As senhas não coincidem" });
    if (senhaAtual === novaSenha) return setSenhaMsg({ tipo: "erro", texto: "A nova senha precisa ser diferente da atual" });

    setSavingSenha(true);
    try {
      const res = await fetch("/api/perfil/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSenhaMsg({ tipo: "erro", texto: data?.error ?? "Erro ao trocar senha" });
        return;
      }
      setSenhaMsg({ tipo: "ok", texto: "Senha alterada com sucesso." });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch {
      setSenhaMsg({ tipo: "erro", texto: "Erro de rede" });
    } finally {
      setSavingSenha(false);
    }
  }

  function Msg({ msg }: { msg: { tipo: "ok" | "erro"; texto: string } | null }) {
    if (!msg) return null;
    const cls = msg.tipo === "ok"
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-300"
      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300";
    return (
      <div className={`p-3 rounded-lg border text-sm ${cls}`}>{msg.texto}</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dados pessoais */}
      <form onSubmit={salvarNome} className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Dados pessoais
        </h3>

        <Msg msg={nameMsg} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-gray-50 dark:bg-[#0a111f] text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">
            Para trocar o e-mail, peça a um administrador.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingName || name === initialName}
            className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingName ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>

      <div className="border-t border-gray-100 dark:border-[#1e2d47]" />

      {/* Trocar senha */}
      <form onSubmit={trocarSenha} className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Trocar senha
        </h3>

        <Msg msg={senhaMsg} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Senha atual
          </label>
          <input
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nova senha
          </label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-gray-400">Mínimo 8 caracteres.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Confirmar nova senha
          </label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#1e2d47] bg-white dark:bg-[#0c1427] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingSenha || !senhaAtual || !novaSenha || !confirmarSenha}
            className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingSenha ? "Trocando..." : "Trocar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
