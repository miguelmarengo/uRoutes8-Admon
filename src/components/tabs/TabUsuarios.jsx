import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Loader2, RefreshCw } from "lucide-react";
import {
  getEmpresas,
  getUsuarios,
  addUsuario,
  updateUsuario,
  deleteUsuario,
} from "../../lib/firestore";

const CHARS_TOKEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generarTokenAcceso = () => {
  let s = "";
  for (let i = 0; i < 3; i++) s += CHARS_TOKEN.charAt(Math.floor(Math.random() * CHARS_TOKEN.length));
  return s;
};

export const TabUsuarios = () => {
  const [empresas, setEmpresas] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterEmpresaId, setFilterEmpresaId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", empresaId: "", activo: true, tokenAcceso: "", sheet: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadEmpresas = async () => {
    try {
      const data = await getEmpresas();
      setEmpresas(data);
    } catch (e) {
      setError(e?.message || "Error al cargar empresas");
    }
  };

  const loadUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const empresaId = filterEmpresaId || null;
      const data = await getUsuarios(empresaId);
      setList(data);
    } catch (e) {
      setError(e?.message || "Error al cargar usuarios");
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

  const openCreate = () => {
    setEditingId(null);
    setForm({
      nombre: "",
      email: "",
      empresaId: filterEmpresaId || (empresas[0]?.id ?? ""),
      activo: true,
      tokenAcceso: generarTokenAcceso(),
      sheet: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre ?? "",
      email: item.email ?? "",
      empresaId: item.empresaId ?? "",
      activo: item.activo !== false,
      tokenAcceso: item.tokenAcceso ?? "",
      sheet: item.sheet ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ nombre: "", email: "", empresaId: "", activo: true, tokenAcceso: "", sheet: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim()) return;
    setSaving(true);
    try {
      const tokenVal = (form.tokenAcceso || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3);
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email?.trim() || null,
        empresaId: form.empresaId || null,
        activo: !!form.activo,
        sheet: form.sheet?.trim() || null,
        ...(tokenVal.length === 3 && { tokenAcceso: tokenVal }),
      };
      if (editingId) {
        await updateUsuario(editingId, payload);
      } else {
        await addUsuario(payload);
      }
      closeModal();
      await loadUsuarios();
    } catch (e) {
      setError(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    setDeletingId(id);
    try {
      await deleteUsuario(id);
      await loadUsuarios();
    } catch (e) {
      setError(e?.message || "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const getEmpresaNombre = (id) => {
    if (!id) return "—";
    const e = empresas.find((x) => x.id === id);
    return e?.nombre ?? id;
  };

  return (
    <div className="rounded-xl border border-border bg-surface-100 p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-medium text-white">Usuarios</h2>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-medium hover:bg-primary-hover transition shrink-0"
          >
            <Plus className="w-5 h-5" />
            Nuevo usuario
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Empresa:</label>
          <select
            value={filterEmpresaId}
            onChange={(e) => setFilterEmpresaId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-200 border border-border text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
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
        <p className="text-muted text-sm py-8">
          No hay usuarios{filterEmpresaId ? " en esta empresa" : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-200 text-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Sheet</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Activo</th>
                <th className="px-4 py-3 font-medium w-28 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-border">
              {list.map((item) => (
                <tr key={item.id} className={`hover:bg-surface-50 ${item.activo === false ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">{item.nombre || "—"}</td>
                  <td className="px-4 py-3 text-muted">{item.email || "—"}</td>
                  <td className="px-4 py-3 text-muted">{getEmpresaNombre(item.empresaId)}</td>
                  <td className="px-4 py-3 text-muted max-w-[180px] truncate" title={item.sheet || ""}>{item.sheet || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {item.activo !== false ? (
                      <span className="text-primary font-medium">Sí</span>
                    ) : (
                      <span className="text-muted">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-50 transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                      title="Eliminar"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={closeModal}
        >
          <div
            className="rounded-xl border border-border bg-surface-100 p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {editingId ? "Editar usuario" : "Nuevo usuario"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Email o código</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="email@ejemplo.com o 1, 01, 12 para pruebas"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Empresa</label>
                <select
                  value={form.empresaId}
                  onChange={(e) => setForm((f) => ({ ...f, empresaId: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sin empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Sheet (hoja de cálculo con acceso)</label>
                <input
                  type="text"
                  value={form.sheet}
                  onChange={(e) => setForm((f) => ({ ...f, sheet: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ID o URL de la hoja de Google Sheets a la que tiene acceso"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Token de acceso (contraseña de 3 caracteres para entrar a los sistemas)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.tokenAcceso}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tokenAcceso: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3),
                      }))
                    }
                    className="w-24 px-4 py-2 rounded-lg bg-surface-200 border border-border text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="•••"
                    maxLength={3}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tokenAcceso: generarTokenAcceso() }))}
                    className="px-3 py-2 rounded-lg bg-surface-200 border border-border text-muted hover:text-white hover:bg-surface-50 flex items-center gap-1"
                    title="Generar nuevo token"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generar
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-surface-200 text-primary focus:ring-primary"
                />
                <label htmlFor="activo" className="text-sm text-muted">
                  Usuario activo (si no está marcado, no podrá usar el sistema pero se conservan sus datos)
                </label>
              </div>
              <div className="flex gap-2 mt-6 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-muted hover:text-white hover:bg-surface-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.nombre?.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-black font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
