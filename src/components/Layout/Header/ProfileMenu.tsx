"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN:      "Admin",
  SUPERVISOR: "Supervisor",
  ANALYST:    "Analista",
  VIEWER:     "Leitor",
};

const ProfileMenu: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [active, setActive] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDropdownToggle = () => setActive((s) => !s);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = session?.user;
  const inicial = user?.name?.charAt(0).toUpperCase() ?? "?";
  const isAdmin = user?.role === "ADMIN";

  return (
    <div
      className="relative profile-menu mx-[8px] md:mx-[10px] lg:mx-[12px] ltr:first:ml-0 ltr:last:mr-0 rtl:first:mr-0 rtl:last:ml-0"
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={handleDropdownToggle}
        className={`flex items-center -mx-[5px] relative ltr:pr-[14px] rtl:pl-[14px] text-black dark:text-white ${
          active ? "active" : ""
        }`}
      >
        <div className="w-[35px] h-[35px] md:w-[42px] md:h-[42px] rounded-full ltr:md:mr-[2px] ltr:lg:mr-[8px] rtl:md:ml-[2px] rtl:lg:ml-[8px] border-[2px] border-primary-200 bg-primary-500 flex items-center justify-center text-white font-bold text-base md:text-lg">
          {inicial}
        </div>
        <span className="block font-semibold text-[0px] lg:text-base">
          {user?.name?.split(" ")[0] ?? ""}
        </span>
        <i className="ri-arrow-down-s-line text-[15px] absolute ltr:-right-[3px] rtl:-left-[3px] top-1/2 -translate-y-1/2 mt-px"></i>
      </button>

      {active && (
        <div className="profile-menu-dropdown bg-white dark:bg-[#0c1427] transition-all shadow-3xl dark:shadow-none py-[18px] absolute mt-[13px] md:mt-[14px] w-[230px] z-[1] top-full ltr:right-0 rtl:left-0 rounded-md">
          <div className="flex items-center border-b border-gray-100 dark:border-[#172036] pb-[12px] mx-[20px] mb-[10px]">
            <div className="w-[36px] h-[36px] rounded-full ltr:mr-[10px] rtl:ml-[10px] border-2 border-primary-200 bg-primary-500 flex items-center justify-center text-white font-bold">
              {inicial}
            </div>
            <div className="min-w-0">
              <span className="block text-black dark:text-white font-medium text-sm truncate">
                {user?.name ?? "—"}
              </span>
              <span className="block text-xs text-gray-500 truncate">
                {user?.role ? ROLE_LABEL[user.role] ?? user.role : ""}
              </span>
            </div>
          </div>

          <ul>
            <li>
              <Link
                href="/perfil"
                onClick={() => setActive(false)}
                className={`block relative py-[7px] ltr:pl-[50px] ltr:pr-[20px] rtl:pr-[50px] rtl:pl-[20px] text-black dark:text-white transition-all hover:text-primary-500 ${
                  pathname === "/perfil" ? "text-primary-500" : ""
                }`}
              >
                <span className="material-symbols-outlined top-1/2 -translate-y-1/2 !text-[22px] absolute ltr:left-[20px] rtl:right-[20px]">
                  account_circle
                </span>
                Meu Perfil
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link
                  href="/configuracoes/usuarios"
                  onClick={() => setActive(false)}
                  className={`block relative py-[7px] ltr:pl-[50px] ltr:pr-[20px] rtl:pr-[50px] rtl:pl-[20px] text-black dark:text-white transition-all hover:text-primary-500 ${
                    pathname.startsWith("/configuracoes/usuarios") ? "text-primary-500" : ""
                  }`}
                >
                  <span className="material-symbols-outlined top-1/2 -translate-y-1/2 !text-[22px] absolute ltr:left-[20px] rtl:right-[20px]">
                    group
                  </span>
                  Usuários
                </Link>
              </li>
            )}
          </ul>

          <div className="border-t border-gray-100 dark:border-[#172036] mx-[20px] my-[9px]"></div>

          <ul>
            <li>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full text-left relative py-[7px] ltr:pl-[50px] ltr:pr-[20px] rtl:pr-[50px] rtl:pl-[20px] text-black dark:text-white transition-all hover:text-primary-500"
              >
                <span className="material-symbols-outlined top-1/2 -translate-y-1/2 !text-[22px] absolute ltr:left-[20px] rtl:right-[20px]">
                  logout
                </span>
                Sair
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
