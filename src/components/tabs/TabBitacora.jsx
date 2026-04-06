import { useState, useEffect } from "react";
import { Loader2, Filter } from "lucide-react";
import { getBitacora, getEmpresas, getUsuarios, getBitacoraTimestampMs } from "../../lib/firestore";

const formatTimestamp = (row) => {
  const ms = getBitacoraTimestampMs(row);
  if (ms != null) {
    return new Date(ms).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "UTC",
    });
  }
  return "—";
};

const formatVersion = (row) => {
  if (row.version && String(row.version).trim()) return row.version;
  const parts = [row.versionApp, row.versionLogin].filter((x) => x && String(x).trim());
  return parts.length ? parts.join(" · ") : "—";
};

export const TabBitacora = () => {
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterEmpresaId, setFilterEmpresaId] = useState("");
  const [filterUsuarioId, setFilterUsuarioId] = useState("");

  const loadEmpresas = async () => {
    try {
      const data = await getEmpresas();
      setEmpresas(data);
    } catch (_) {}
  };

  const loadUsuarios = async () => {
    try {
      const data = await getUsuarios(filterEmpresaId || null);
      setUsuarios(data);
    } catch (_) {}
  };

  const loadBitacora = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterEmpresaId) filters.empresaId = filterEmpresaId;
      if (filterUsuarioId) filters.usuarioId = filterUsuarioId;
      const data = await getBitacora(filters);
      setList(data);
    } catch (e) {
      setError(e?.message || "Error al cargar bitácora");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [filterEmpresaId]);

  useEffect(() => {
    loadBitacora();
  }, [filterEmpresaId, filterUsuarioId]);

  const getEmpresaNombre = (id) => {
    if (!id) return "—";
    const e = empresas.find((x) => x.id === id);
    return e?.nombre ?? id;
  };

  const getUsuarioNombre = (id) => {
    if (!id) return "—";
    const u = usuarios.find((x) => x.id === id);
    return u ? (u.nombre || u.email || u.id) : id;
  };

  const displayUsuario = (item) => {
    const n = (item.usuarioNombre || "").trim();
    if (n) return n;
    return item.usuarioDocId || item.usuarioId ? getUsuarioNombre(item.usuarioDocId || item.usuarioId) : "—";
  };

  const displayEmpresa = (item) => {
    const n = (item.empresaNombre || "").trim();
    if (n) return n;
    return item.empresaId ? getEmpresaNombre(item.empresaId) : "—";
  };

  return (
    <div className="rounded-xl border border-border bg-surface-100 p-6">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-lg font-medium text-white">Bitácora</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <Filter className="w-4 h-4" />
            Filtros:
          </span>
          <select
            value={filterEmpresaId}
            onChange={(e) => {
              setFilterEmpresaId(e.target.value);
              setFilterUsuarioId("");
            }}
            className="px-3 py-2 rounded-lg bg-surface-200 border border-border text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <select
            value={filterUsuarioId}
            onChange={(e) => setFilterUsuarioId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-200 border border-border text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre || u.email || u.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-muted text-sm py-8">No hay registros en la bitácora.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-200 text-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha / hora (UTC)</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Módulo (login)</th>
                <th className="px-4 py-3 font-medium">Versión</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-border">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatTimestamp(item)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {displayEmpresa(item)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {displayUsuario(item)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {(item.moduloEntradaEtiqueta || item.moduloEntrada || "").trim() || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[220px] break-words">
                    {formatVersion(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
