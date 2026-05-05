import LoginForm from "@/components/Funcional/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Funcional Farma",
};

export default function LoginPage() {
  return <LoginForm />;
}
