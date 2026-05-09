import LoginForm from "@/components/Funcional/LoginForm";
import Logo from "@/components/Funcional/Logo";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Funcional Farma",
};

const FEATURES = [
  {
    icon: "auto_awesome",
    title: "Conciliação automática",
    desc: "Match por NF entre Autorizador e Proteus, sem PROCV manual.",
  },
  {
    icon: "shield_lock",
    title: "Conforme LGPD",
    desc: "Audit log completo e dados de paciente nunca trafegam.",
  },
  {
    icon: "rocket_launch",
    title: "Export pronto para J&J",
    desc: "Planilhas formatadas — grandes redes e convencionais separadas.",
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#070b16]">
      {/* ─── LEFT: brand panel ────────────────────────────────────────── */}
      <div className="relative lg:w-1/2 flex flex-col justify-between overflow-hidden p-8 lg:p-12 bg-gradient-to-br from-[#0a1530] via-[#0e1d3f] to-[#070b16]">
        {/* Glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(96,93,255,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Top bar */}
        <div className="relative z-10 flex justify-between items-center">
          <span className="text-xs text-gray-500 tracking-wider uppercase">
            Funcional Farma
          </span>
          <span className="text-xs text-gray-500">v1.0</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto py-12">
          {/* Logo (sempre branca aqui — fundo escuro fixo) */}
          <div className="mb-6">
            <Logo width={220} height={56} priority />
          </div>

          {/* Status pill */}
          <span className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-[#1e2d47] bg-[#0a1220]/60 text-xs text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Sistema em produção
          </span>

          {/* Headline */}
          <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
            Pedidos, conciliação<br />
            e faturamento{" "}
            <span className="text-primary-400">em uma tela só.</span>
          </h1>

          <p className="text-sm text-gray-400 leading-relaxed max-w-md">
            Importação automática do Autorizador e Proteus,
            conciliação por NF, gestão de divergências e exportação
            pronta para a J&amp;J — sem PROCV e sem madrugada.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 w-full max-w-md">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[#0a1220]/80 border border-[#1e2d47] rounded-xl p-4 backdrop-blur-sm text-left hover:border-primary-500/40 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-primary-400 text-base">
                    {f.icon}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white mb-1">
                  {f.title}
                </div>
                <div className="text-[11px] text-gray-400 leading-snug">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 text-xs text-gray-500 text-center lg:text-left">
          © {new Date().getFullYear()} Funcional Farma · Conciliação J&amp;J
        </div>
      </div>

      {/* ─── RIGHT: form ──────────────────────────────────────────────── */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-[#070b16]">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            Entre com suas credenciais para acessar o painel.
          </p>

          <LoginForm />

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="material-symbols-outlined text-sm">lock</span>
            Conexão segura — dados criptografados
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">
            Ao entrar, você concorda com nossa{" "}
            <Link href="/privacidade" className="text-gray-400 hover:text-white underline underline-offset-2">
              política de privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
