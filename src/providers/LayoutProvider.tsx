"use client";

import React, { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import FuncionalSidebar from "@/components/Funcional/FuncionalSidebar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

interface LayoutProviderProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/privacidade", "/termos"];

const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const [active, setActive] = useState<boolean>(false);

  const toggleActive = () => setActive(!active);

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className={`main-content-wrap transition-all ${active ? "active" : ""}`}>
      {!isPublicRoute && (
        <>
          <FuncionalSidebar toggleActive={toggleActive} />
          <Header toggleActive={toggleActive} />
        </>
      )}

      <div className="main-content transition-all flex flex-col overflow-hidden min-h-screen">
        {children}
        {!isPublicRoute && <Footer />}
      </div>
    </div>
  );
};

export default LayoutProvider;
