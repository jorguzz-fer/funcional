"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Funcional/Logo";

interface SidebarProps {
  toggleActive: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  children?: { href: string; label: string }[];
}

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/faturamento",
    label: "Faturamento",
    icon: "receipt_long",
    children: [
      { href: "/faturamento", label: "Histórico" },
      { href: "/faturamento/novo", label: "Novo Fechamento" },
    ],
  },
  {
    href: "/analises",
    label: "Análises",
    icon: "bar_chart",
    children: [
      { href: "/analises/por-clinica", label: "Por Clínica" },
      { href: "/analises/por-medicamento", label: "Por Medicamento" },
      { href: "/analises/por-ano", label: "Por Ano" },
    ],
  },
  {
    href: "/clinicas",
    label: "Clínicas",
    icon: "local_hospital",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: "settings",
    children: [
      { href: "/configuracoes/usuarios", label: "Usuários" },
      { href: "/configuracoes/reclassificacoes", label: "Reclassificações" },
      { href: "/configuracoes/audit-log", label: "Audit Log" },
    ],
  },
];

export default function FuncionalSidebar({ toggleActive }: SidebarProps) {
  const pathname = usePathname();
  const [openSection, setOpenSection] = React.useState<string | null>(() => {
    const active = NAV.find((n) => n.children && pathname.startsWith(n.href));
    return active?.href ?? null;
  });

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <div className="sidebar-area bg-white dark:bg-[#0c1427] fixed z-[7] top-0 h-screen transition-all rounded-r-md">
      {/* Logo */}
      <div className="logo bg-white dark:bg-[#0c1427] border-b border-gray-100 dark:border-[#172036] px-[25px] pt-[19px] pb-[15px] absolute z-[2] right-0 top-0 left-0">
        <Link
          href="/dashboard"
          className="transition-none relative flex items-center outline-none"
        >
          <Logo width={150} height={40} priority />
        </Link>

        <button
          type="button"
          className="burger-menu inline-block absolute z-[3] top-[24px] ltr:right-[25px] rtl:left-[25px] transition-all hover:text-primary-500"
          onClick={toggleActive}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Nav */}
      <div className="pt-[89px] px-[22px] pb-[20px] h-screen overflow-y-auto sidebar-custom-scrollbar">
        <nav className="accordion">
          <span className="block relative font-medium uppercase text-gray-400 mb-[8px] text-xs">
            Menu
          </span>

          {NAV.map((item) => {
            const active = isActive(item.href);

            if (!item.children) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-[10px] py-[9px] px-[14px] rounded-md font-medium w-full transition-all mb-[5px] ${
                    active
                      ? "bg-primary-500 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#15203c]"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${item.badgeColor ?? "bg-primary-100 text-primary-600"}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            }

            const isOpen = openSection === item.href;

            return (
              <div key={item.href} className="accordion-item rounded-md mb-[5px]">
                <button
                  onClick={() => setOpenSection(isOpen ? null : item.href)}
                  className={`flex items-center gap-[10px] py-[9px] px-[14px] rounded-md font-medium w-full transition-all relative ${
                    active && !isOpen
                      ? "text-primary-500"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#15203c]"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  <span
                    className={`material-symbols-outlined text-sm ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    expand_more
                  </span>
                </button>

                {isOpen && (
                  <div className="accordion-body pl-[44px] mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block py-[7px] px-[10px] rounded-md text-sm transition-all ${
                          pathname === child.href
                            ? "text-primary-500 font-semibold bg-primary-50 dark:bg-primary-900/10"
                            : "text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer do sidebar */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-[#172036]">
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            Funcional Farma &bull; Faturamento J&amp;J
          </p>
        </div>
      </div>
    </div>
  );
}
