import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Health check para balanceador de carga, orquestrador e monitoramento.
 *
 * Rota pública (ver PUBLIC_PATHS no middleware) e deliberadamente sem
 * detalhes de versão, ambiente ou stack — um health check é superfície de
 * reconhecimento para atacante, então devolve apenas o mínimo necessário.
 *
 * 200 → aplicação e banco respondendo
 * 503 → banco inacessível (instância deve sair do balanceador)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        latencyMs: Date.now() - inicio,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
