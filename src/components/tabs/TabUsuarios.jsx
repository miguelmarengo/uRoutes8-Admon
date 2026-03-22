import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { deleteField } from "firebase/firestore";
import {
  getEmpresas,
  getUsuarios,
  addUsuario,
  updateUsuario,
  deleteUsuario,
} from "../../lib/firestore";
import { collectUsuarioBodegaIds } from "../../lib/clienteSesion";
import { leerTokenDesdeUsuario, normalizarTokenAcceso } from "../../lib/usuarioToken";

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
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    empresaId: "",
    bodegaIds: [],
    activo: true,
    tokenAcceso: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [mostrarToken, setMostrarToken] = useState(false);

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
    setError(null);
    setEditingId(null);
    setForm({
      nombre: "",
      email: "",
      empresaId: filterEmpresaId || (empresas[0]?.id ?? ""),
      bodegaIds: [],
      activo: true,
      tokenAcceso: generarTokenAcceso(),
    });
    setMostrarToken(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setError(null);
    setEditingId(item.id);
    setForm({
      nombre: item.nombre ?? "",
      email: item.email ?? "",
      empresaId: item.empresaId ?? "",
      bodegaIds: collectUsuarioBodegaIds(item),
      activo: item.activo !== false,
      tokenAcceso: leerTokenDesdeUsuario(item),
    });
    setMostrarToken(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setMostrarToken(false);
    setForm({ nombre: "", email: "", empresaId: "", bodegaIds: [], activo: true, tokenAcceso: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.nombre?.trim()) return;
    const tokenVal = normalizarTokenAcceso(form.tokenAcceso);
    if (tokenVal.length !== 3) {
      setError("El token de acceso debe tener exactamente 3 letras o números. Se guarda en Firestore como tokenAcceso y es lo que usan los otros módulos al hacer login.");
      return;
    }
    const bod = bodegasDeEmpresaSeleccionada();
    const idsSet = new Set(bod.map((b) => b.id).filter(Boolean));
    const bodegaIdsLimpios = [...new Set((form.bodegaIds || []).filter((id) => idsSet.has(id)))];
    if (form.empresaId && bod.length > 0 && bodegaIdsLimpios.length === 0) {
      setError("Selecciona al menos una bodega: el usuario solo verá datos de las bodegas que marques.");
      return;
    }
    if (bodegaIdsLimpios.length !== (form.bodegaIds || []).length) {
      setError("Alguna bodega marcada no pertenece a la empresa. Revisa la selección.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email?.trim() || null,
        empresaId: form.empresaId || null,
        bodegaIds: form.empresaId ? bodegaIdsLimpios : [],
        activo: !!form.activo,
        tokenAcceso: tokenVal,
        ...(editingId
          ? {
              sheet: deleteField(),
              bodegaId: deleteField(),
              password: deleteField(),
              token: deleteField(),
              codigoAcceso: deleteField(),
            }
          : {}),
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

  const etiquetaBodegasAcceso = (item) => {
    const ids = collectUsuarioBodegaIds(item);
    if (ids.length === 0) return "—";
    const e = empresas.find((x) => x.id === item.empresaId);
    const names = ids.map((id) => {
      const b = Array.isArray(e?.bodegas) ? e.bodegas.find((x) => x.id === id) : null;
      return b?.nombre?.trim() || id;
    });
    return names.join(", ");
  };

  const bodegasDeEmpresaSeleccionada = () => {
    const e = empresas.find((x) => x.id === form.empresaId);
    return Array.isArray(e?.bodegas) ? e.bodegas : [];
  };

  const toggleBodegaEnForm = (bodegaId, checked) => {
    setForm((f) => {
      const cur = new Set(f.bodegaIds || []);
      if (checked) cur.add(bodegaId);
      else cur.delete(bodegaId);
      return { ...f, bodegaIds: [...cur] };
    });
  };

  const seleccionarTodasBodegasForm = () => {
    const all = bodegasDeEmpresaSeleccionada().map((b) => b.id).filter(Boolean);
    setForm((f) => ({ ...f, bodegaIds: all }));
  };

  const limpiarBodegasForm = () => {
    setForm((f) => ({ ...f, bodegaIds: [] }));
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
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Bodegas con acceso</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Activo</th>
                <th className="px-4 py-3 font-medium w-28 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-border">
              {list.map((item) => {
                const tokenTabla = leerTokenDesdeUsuario(item);
                return (
                <tr key={item.id} className={`hover:bg-surface-50 ${item.activo === false ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">{item.nombre || "—"}</td>
                  <td className="px-4 py-3 text-muted">{item.email || "—"}</td>
                  <td
                    className="px-4 py-3 text-muted font-mono text-xs"
                    title={tokenTabla.length === 3 ? `Token: ${tokenTabla}` : "Sin token de 3 caracteres — edita el usuario y guarda"}
                  >
                    {tokenTabla.length === 3 ? "•••" : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{getEmpresaNombre(item.empresaId)}</td>
                  <td className="px-4 py-3 text-muted max-w-[220px] truncate" title={etiquetaBodegasAcceso(item)}>
                    {etiquetaBodegasAcceso(item)}
                  </td>
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
              );
              })}
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
                  onChange={(e) => {
                    const nextEmpresaId = e.target.value;
                    setForm((f) => {
                      const bod = empresas.find((x) => x.id === nextEmpresaId);
                      const valid = new Set(
                        Array.isArray(bod?.bodegas) ? bod.bodegas.map((b) => b.id).filter(Boolean) : []
                      );
                      const nextIds = (f.bodegaIds || []).filter((id) => valid.has(id));
                      return { ...f, empresaId: nextEmpresaId, bodegaIds: nextIds };
                    });
                  }}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <label className="block text-sm text-muted">¿A qué bodegas tiene acceso?</label>
                  {form.empresaId && bodegasDeEmpresaSeleccionada().length > 0 && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={seleccionarTodasBodegasForm}
                        className="text-xs text-primary hover:underline"
                      >
                        Marcar todas
                      </button>
                      <span className="text-muted text-xs">·</span>
                      <button type="button" onClick={limpiarBodegasForm} className="text-xs text-muted hover:text-white">
                        Quitar todas
                      </button>
                    </div>
                  )}
                </div>
                {!form.empresaId ? (
                  <p className="text-xs text-muted rounded-lg border border-border/60 bg-surface-200/30 px-3 py-2">
                    Primero elige empresa; luego podrás marcar las bodegas (definidas en la ficha de la empresa).
                  </p>
                ) : bodegasDeEmpresaSeleccionada().length === 0 ? (
                  <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    Esta empresa aún no tiene bodegas dadas de alta. Créalas en Empresas; aquí no habrá qué asignar.
                  </p>
                ) : (
                  <ul className="rounded-lg border border-border bg-surface-200/40 divide-y divide-border max-h-48 overflow-y-auto">
                    {bodegasDeEmpresaSeleccionada().map((b) => {
                      const checked = (form.bodegaIds || []).includes(b.id);
                      return (
                        <li key={b.id}>
                          <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-200/80">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleBodegaEnForm(b.id, e.target.checked)}
                              className="w-4 h-4 rounded border-border bg-surface-200 text-primary focus:ring-primary shrink-0"
                            />
                            <span className="text-sm text-white">{b.nombre?.trim() || b.id}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Solo verá dashboards y datos de las bodegas marcadas. El login devuelve ese subconjunto en{" "}
                  <code className="text-primary/90">bodegas</code> e <code className="text-primary/90">usuario.bodegaIds</code>.
                </p>
              </div>
              <p className="text-xs text-muted rounded-lg bg-surface-200/50 border border-border/60 px-3 py-2">
                La hoja de Google Sheet se asigna por bodega en la ficha de la empresa, no por usuario.
              </p>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Token de acceso (3 caracteres — se guarda en Firestore como{" "}
                  <code className="text-primary/90">tokenAcceso</code>)
                </label>
                <p className="text-xs text-muted mb-2">
                  Si el documento tenía el valor en <code>password</code>, <code>token</code> o <code>codigoAcceso</code>, aquí se muestra igual; al guardar se escribe{" "}
                  <code>tokenAcceso</code> para que el login de los módulos funcione.
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type={mostrarToken ? "text" : "password"}
                    value={form.tokenAcceso}
                    autoComplete="off"
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
                    onClick={() => setMostrarToken((v) => !v)}
                    className="p-2 rounded-lg bg-surface-200 border border-border text-muted hover:text-white hover:bg-surface-50"
                    title={mostrarToken ? "Ocultar token" : "Mostrar token"}
                    aria-label={mostrarToken ? "Ocultar token" : "Mostrar token"}
                  >
                    {mostrarToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tokenAcceso: generarTokenAcceso() }))}
                    className="px-3 py-2 rounded-lg bg-surface-200 border border-border text-muted hover:text-white hover:bg-surface-50 flex items-center gap-1 shrink-0"
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
                  disabled={
                    saving ||
                    !form.nombre?.trim() ||
                    normalizarTokenAcceso(form.tokenAcceso).length !== 3
                  }
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
