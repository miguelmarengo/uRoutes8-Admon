import { useState } from "react";
import { Building2, Users, ScrollText, BarChart3, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { TabEmpresas } from "../components/tabs/TabEmpresas";
import { TabUsuarios } from "../components/tabs/TabUsuarios";
import { TabBitacora } from "../components/tabs/TabBitacora";
import { TabEstadisticas } from "../components/tabs/TabEstadisticas";

const TABS = [
  { id: "empresas", label: "Empresas", icon: Building2, component: TabEmpresas },
  { id: "usuarios", label: "Usuarios", icon: Users, component: TabUsuarios },
  { id: "bitacora", label: "Bitácora", icon: ScrollText, component: TabBitacora },
  {
    id: "estadisticas",
    label: "Estadísticas",
    icon: BarChart3,
    component: TabEstadisticas,
  },
];

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [activeTabId, setActiveTabId] = useState("empresas");

  const ActiveComponent = TABS.find((t) => t.id === activeTabId)?.component;

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col font-sans">
      <header className="h-14 border-b border-border bg-surface-200 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-lg font-semibold text-white">uRoutes Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted truncate max-w-[180px]">
            {user?.displayName ?? user?.email ?? "—"}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-50 transition flex items-center gap-2"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Salir</span>
          </button>
        </div>
      </header>

      <nav className="sticky top-0 z-10 bg-surface-200 border-b-2 border-primary shrink-0">
        <div className="flex overflow-x-auto min-h-[52px]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 -mb-0.5 shrink-0 transition
                  ${
                    isActive
                      ? "bg-primary text-black border-primary font-medium"
                      : "text-gray-400 border-transparent hover:text-white hover:bg-primary/10"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {ActiveComponent ? <ActiveComponent /> : null}
      </main>
    </div>
  );
};
