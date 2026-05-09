"use client";

import React, { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const MONO_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-mono), ui-monospace, monospace",
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("E-mail ou senha inválidos.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-md border border-[#5a1f1f] bg-[#1a0d0d] text-[13px] text-[#ffb3b3]"
        >
          <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-px">
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* E-mail */}
      <div>
        <label
          htmlFor="email"
          className="block text-[10px] tracking-[0.18em] uppercase text-[#a8a8b3] mb-2.5"
          style={MONO_LABEL}
        >
          E-mail corporativo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.nome@funcionalfarma.com.br"
          className="w-full px-4 py-3.5 rounded-md border border-[#26262d] bg-[#0a0a10] text-[15px] text-[#f4f4f0] placeholder-[#4a4a52] focus:outline-none focus:border-[#ff7a2e] focus:ring-2 focus:ring-[#ff7a2e]/20 transition"
        />
      </div>

      {/* Senha */}
      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <label
            htmlFor="password"
            className="text-[10px] tracking-[0.18em] uppercase text-[#a8a8b3]"
            style={MONO_LABEL}
          >
            Senha
          </label>
          <span
            className="text-[10px] tracking-[0.12em] uppercase text-[#5a5a63]"
            style={MONO_LABEL}
          >
            Mín. 8 caracteres
          </span>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-3.5 pr-12 rounded-md border border-[#26262d] bg-[#0a0a10] text-[15px] text-[#f4f4f0] placeholder-[#4a4a52] focus:outline-none focus:border-[#ff7a2e] focus:ring-2 focus:ring-[#ff7a2e]/20 transition tracking-widest"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded text-[#7a7a83] hover:text-[#f4f4f0] hover:bg-[#1f1f26] transition"
            aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPass ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !email || !password}
        className="group relative w-full overflow-hidden rounded-md bg-[#ff7a2e] hover:bg-[#ff8c4a] active:bg-[#e56516] disabled:bg-[#3a2418] disabled:cursor-not-allowed transition-all py-4 mt-2 shadow-[0_8px_24px_-8px_rgba(255,122,46,0.4)] hover:shadow-[0_12px_32px_-8px_rgba(255,122,46,0.5)] disabled:shadow-none"
      >
        <span className="relative flex items-center justify-center gap-2.5 text-[14px] font-semibold text-[#0a0a0b] tracking-tight">
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
              Autenticando…
            </>
          ) : (
            <>
              Entrar na plataforma
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </>
          )}
        </span>
      </button>
    </form>
  );
}
