import { useState, useEffect } from "react";
import { Building2, Users, ScrollText, BarChart3, Loader2 } from "lucide-react";
import { getEmpresas } from "../../lib/firestore";
import { getUsuarios } from "../../lib/firestore";
import { getBitacora } from "../../lib/firestore";

const Card = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-xl border border-border bg-surface-200 p-6 flex items-start gap-4">
    <div className="p-3 rounded-lg bg-primary/20 text-primary">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-sm text-muted">{label}</p>
      {sub != null && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  </div>
);

export const TabEstadisticas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    empresas: 0,
    usuarios: 0,
    bitacora: 0,
    bitacoraUltimos: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const run = async () => {
      try {
        const [empresas, usuarios, bitacora] = await Promise.all([
          getEmpresas(),
          getUsuarios(),
          getBitacora({}),
        ]);
        if (cancelled) return;
        const now = Date.now();
        const last24h = 24 * 60 * 60 * 1000;
        const bitacoraRecientes = bitacora.filter((b) => {
          const ts = b.timestamp?.toMillis?.() ?? b.timestamp;
          return ts && now - ts < last24h;
        });
        setStats({
          empresas: empresas.length,
          usuarios: usuarios.length,
          bitacora: bitacora.length,
          bitacoraUltimos: bitacoraRecientes.length,
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || "Error al cargar estadísticas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-100 p-6 flex items-center justify-center py-16 text-muted">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface-100 p-6">
        <h2 className="text-lg font-medium text-white mb-4">Estadísticas</h2>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-100 p-6">
      <h2 className="text-lg font-medium text-white mb-6">Estadísticas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          icon={Building2}
          label="Empresas"
          value={stats.empresas}
          sub="Total registradas"
        />
        <Card
          icon={Users}
          label="Usuarios"
          value={stats.usuarios}
          sub="Total en el sistema"
        />
        <Card
          icon={ScrollText}
          label="Registros bitácora"
          value={stats.bitacora}
          sub="Total histórico"
        />
        <Card
          icon={BarChart3}
          label="Bitácora (24 h)"
          value={stats.bitacoraUltimos}
          sub="Últimas 24 horas"
        />
      </div>
    </div>
  );
};
