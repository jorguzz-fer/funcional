import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { logAuthEvent, getRequestContext } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials, req) {
        const { ip: ctxIp, userAgent } = getRequestContext(
          (req as { headers?: Headers })?.headers,
        );
        const ip = ctxIp ?? "unknown";

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          // Não temos e-mail confiável aqui — registra apenas a origem.
          await logAuthEvent({
            action: "auth.login_failed",
            reason: "invalid_input",
            ip: ctxIp,
            userAgent,
          });
          return null;
        }

        const email = parsed.data.email.toLowerCase();

        const [ipOk, emailOk] = await Promise.all([
          rateLimit({ key: `login:ip:${ip}`, windowSec: 900, max: 20 }),
          rateLimit({ key: `login:email:${email}`, windowSec: 3600, max: 10 }),
        ]);
        if (!ipOk.allowed || !emailOk.allowed) {
          await logAuthEvent({
            action: "auth.rate_limited",
            email,
            ip: ctxIp,
            userAgent,
            meta: {
              escopo: !ipOk.allowed ? "ip" : "email",
              retryAfterSec: !ipOk.allowed ? ipOk.retryAfterSec : emailOk.retryAfterSec,
            },
          });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.active) {
          await logAuthEvent({
            action: "auth.login_failed",
            userId: user?.id ?? null,
            email,
            reason: user ? "user_inactive" : "user_not_found",
            ip: ctxIp,
            userAgent,
          });
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await logAuthEvent({
            action: "auth.login_failed",
            userId: user.id,
            email,
            reason: "invalid_password",
            ip: ctxIp,
            userAgent,
          });
          return null;
        }

        await logAuthEvent({
          action: "auth.login",
          userId: user.id,
          email,
          ip: ctxIp,
          userAgent,
          meta: { role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    /**
     * Logout. Não capturamos IP aqui de propósito: `next/headers` não é
     * acessível no runtime edge usado pelo middleware, que também importa
     * este módulo. O IP relevante para investigação já é registrado no
     * login e nas falhas de autenticação.
     */
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (!token) return;
      await logAuthEvent({
        action: "auth.logout",
        userId: (token.id as string | undefined) ?? null,
        email: token.email ?? null,
      });
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id   = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
