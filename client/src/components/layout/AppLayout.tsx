import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="pl-[260px] pt-[25px] px-[25px] pb-[25px]">
        <div className="ml-[25px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
