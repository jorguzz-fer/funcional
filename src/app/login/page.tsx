import LoginForm from "@/components/Funcional/LoginForm";
import Logo from "@/components/Funcional/Logo";
import Link from "next/link";
import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Inter_Tight } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Login — Funcional Farma",
  description: "Acesso à plataforma de conciliação Autorizador × Proteus",
};

const FEATURES = [
  {
    num: "01",
    title: "Conciliação por NF",
    desc: "Match Autorizador × Proteus em segundos. Adeus PROCV.",
  },
  {
    num: "02",
    title: "Conforme LGPD",
    desc: "Audit log completo. Dados de paciente nunca trafegam.",
  },
  {
    num: "03",
    title: "Export J&J",
    desc: "Planilhas separadas — grandes redes e convencionais.",
  },
];

export default function LoginPage() {
  const year = new Date().getFullYear();

  return (
    // .auth-main-content ativa o reset de padding no LayoutProvider → full-width
    <div
      className={`auth-main-content ${fraunces.variable} ${interTight.variable} ${jetbrains.variable}`}
    >
      <div
        className="min-h-screen w-full grid lg:grid-cols-[1.15fr_0.85fr]"
        style={{
          background: "#0a0a0b",
          fontFamily: "var(--font-body), system-ui, sans-serif",
          color: "#f4f4f0",
        }}
      >
        {/* ════════════════════ LEFT · BRAND PANEL ════════════════════ */}
        <aside
          className="relative flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1f1f26]"
          style={{
            background:
              "linear-gradient(135deg, #0a0a0b 0%, #131318 50%, #0d0d12 100%)",
          }}
        >
          {/* Grain texture overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.04,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Warm accent glow */}
          <div
            aria-hidden
            className="absolute pointer-events-none -top-1/4 -left-1/4 w-[80%] h-[80%]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(242,254,143,0.08) 0%, transparent 65%)",
            }}
          />
          <div
            aria-hidden
            className="absolute pointer-events-none -bottom-1/4 -right-1/4 w-[60%] h-[60%]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(168,200,80,0.05) 0%, transparent 65%)",
            }}
          />

          {/* Header */}
          <header className="relative z-10 flex items-start justify-between px-8 lg:px-14 pt-10 lg:pt-12">
            <Logo variant="white" width={170} height={42} priority />
            <div
              className="flex items-center gap-2 mt-2"
              style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6ee7a7] animate-pulse" />
              <span className="text-[10px] tracking-[0.18em] text-[#6ee7a7] uppercase">
                Em produção
              </span>
            </div>
          </header>

          {/* Hero */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-8 lg:px-14 py-14 lg:py-16">
            <p
              className="text-[10px] tracking-[0.22em] text-[#F2FE8F] uppercase mb-7"
              style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
            >
              <span className="inline-block w-6 h-px bg-[#F2FE8F] mr-3 align-middle" />
              Acesso privado · v1.0
            </p>

            <h1
              className="text-[2.5rem] sm:text-[3rem] lg:text-[3.75rem] leading-[1.02] tracking-[-0.025em] font-bold text-white max-w-2xl"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              <span style={{ color: "#F2FE8F" }}>Conciliação</span>{" "}
              <em className="font-medium italic text-white">
                que não exige
                <br />
                madrugada.
              </em>
            </h1>

            <p className="text-[15px] lg:text-[16px] text-[#c4c4cc] leading-relaxed mt-7 max-w-xl">
              Importação automática do Autorizador e Proteus, conciliação por NF,
              gestão de divergências e exportação pronta para a J&amp;J — em um
              único ambiente, com audit log e conformidade LGPD.
            </p>

            {/* Feature cards */}
            <div className="mt-12">
              <div
                className="text-[10px] tracking-[0.18em] uppercase text-[#7a7a83] mb-4 flex items-center gap-3"
                style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
              >
                <span className="h-px w-6 bg-[#3a3a40]" />
                O que está dentro
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FEATURES.map((f) => (
                  <article
                    key={f.num}
                    className="group relative p-5 rounded-md border border-[#26262d] bg-[#0f0f14]/70 backdrop-blur-sm transition-all hover:border-[#F2FE8F]/40 hover:bg-[#13131a]/80"
                  >
                    <div
                      className="text-[10px] tracking-[0.2em] text-[#F2FE8F] mb-2.5 transition-transform group-hover:translate-x-0.5"
                      style={{
                        fontFamily: "var(--font-mono), ui-monospace, monospace",
                      }}
                    >
                      {f.num} ◇
                    </div>
                    <h3
                      className="text-[14px] leading-tight font-semibold mb-2"
                      style={{
                        fontFamily: "var(--font-display), Georgia, serif",
                        color: "#F2FE8F",
                      }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-[12px] text-[#a8a8b3] leading-snug">
                      {f.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="relative z-10 px-8 lg:px-14 pb-8 lg:pb-10 flex items-center justify-between text-[10px] tracking-[0.15em] uppercase text-[#5a5a63]"
            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          >
            <span>© {year} · Funcional Farma</span>
            <span className="hidden sm:inline">Conciliação J&amp;J · Programa BR-A/DSP</span>
          </div>
        </aside>

        {/* ════════════════════ RIGHT · LOGIN FORM ════════════════════ */}
        <section
          className="relative flex flex-col"
          style={{ background: "#0d0d12" }}
        >
          {/* Subtle vertical accent line */}
          <div
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-px hidden lg:block"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, #1f1f26 30%, #1f1f26 70%, transparent 100%)",
            }}
          />

          {/* Top status */}
          <div className="px-8 lg:px-14 pt-10 lg:pt-12 flex justify-end">
            <span
              className="text-[10px] tracking-[0.18em] uppercase text-[#7a7a83]"
              style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
            >
              Sessão · TLS 1.3
            </span>
          </div>

          {/* Form */}
          <div className="flex-1 flex items-center justify-center px-8 lg:px-14 py-10">
            <div className="w-full max-w-md">
              <p
                className="text-[10px] tracking-[0.22em] uppercase text-[#F2FE8F] mb-5 flex items-center gap-3"
                style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
              >
                <span className="h-px w-8 bg-[#F2FE8F]" />
                Entrar
              </p>

              <h2
                className="text-[2.25rem] lg:text-[2.5rem] leading-[1.05] tracking-[-0.025em] text-white mb-3"
                style={{
                  fontFamily: "var(--font-display), Georgia, serif",
                  fontWeight: 600,
                }}
              >
                Bem-vindo de{" "}
                <em
                  className="italic font-normal"
                  style={{ color: "#F2FE8F" }}
                >
                  volta.
                </em>
              </h2>
              <p className="text-[14px] text-[#a8a8b3] mb-9">
                Acesso restrito à equipe da Funcional Farma. Use suas
                credenciais corporativas.
              </p>

              <LoginForm />
            </div>
          </div>

          {/* Footer */}
          <footer className="px-8 lg:px-14 pb-10 lg:pb-12">
            <div className="border-t border-[#1f1f26] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] text-[#a8a8b3]">
                <span className="material-symbols-outlined text-[16px] text-[#6ee7a7]">
                  lock
                </span>
                <span>
                  Conexão criptografada{" "}
                  <span className="text-[#5a5a63]">·</span> Dados protegidos
                </span>
              </div>
              <div
                className="flex items-center gap-4 text-[11px] tracking-[0.1em] uppercase"
                style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
              >
                <Link
                  href="/privacidade"
                  className="text-[#7a7a83] hover:text-[#f4f4f0] transition underline-offset-4 hover:underline"
                >
                  Privacidade
                </Link>
                <span className="text-[#3a3a40]">·</span>
                <Link
                  href="/termos"
                  className="text-[#7a7a83] hover:text-[#f4f4f0] transition underline-offset-4 hover:underline"
                >
                  Termos
                </Link>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
