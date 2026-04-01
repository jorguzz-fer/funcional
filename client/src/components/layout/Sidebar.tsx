import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  GitCompareArrows,
  History,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/reconciliation", icon: GitCompareArrows, label: "Conciliação" },
  { to: "/history", icon: History, label: "Histórico" },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-[260px] bg-sidebar text-white flex flex-col min-h-screen fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="px-[25px] py-[20px] border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Funcional
        </h1>
        <p className="text-[11px] text-gray-400 mt-[4px]">
          Dashboard de Faturamento
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-[14px] py-[15px] space-y-[2px]">
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider px-[14px] mb-[10px]">
          Menu Principal
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-[12px] px-[14px] py-[9px] rounded-md text-[14px] font-medium transition-all ${
                isActive
                  ? "bg-primary-500 text-white"
                  : "text-gray-400 hover:bg-sidebar-hover hover:text-white"
              }`
            }
          >
            <item.icon size={20} strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-[20px] py-[15px] border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-medium truncate text-white">
              {user?.name}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-[8px] rounded-md hover:bg-sidebar-hover transition-all text-gray-500 hover:text-white"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
