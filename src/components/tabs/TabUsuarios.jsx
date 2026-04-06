import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Loader2, RefreshCw, Eye, EyeOff, Copy, ClipboardPaste } from "lucide-react";
import { deleteField } from "firebase/firestore";
import {
  getEmpresas,
  getUsuarios,
  addUsuario,
  updateUsuario,
  deleteUsuario,
} from "../../lib/firestore";
import { collectUsuarioBodegaIds } from "../../lib/clienteSesion";
import { leerTokenDesdeUsuario, normalizarTokenAcceso, generarTokenAcceso } from "../../lib/usuarioToken";
import { TODOS_LOS_MODULOS, etiquetaModulo } from "../../lib/constants";
let clipboardUsuarioForm = null;

export const TabUsuarios = () => {
  const modulosOrdenados = useMemo(
    () =>
      [...TODOS_LOS_MODULOS].sort((a, b) =>
        etiquetaModulo(a).localeCompare(etiquetaModulo(b), "es", { sensitivity: "base" })
      ),
    []
  );

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
    modulos: [],
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
      modulos: [],
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
      modulos: item.modulos || [],
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
    setForm({ nombre: "", email: "", empresaId: "", bodegaIds: [], modulos: [], activo: true, tokenAcceso: "" });
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
        modulos: form.modulos || [],
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

  const toggleModuloEnForm = (modulo, checked) => {
    setForm((f) => {
      const cur = new Set(f.modulos || []);
      if (checked) cur.add(modulo);
      else cur.delete(modulo);
      return { ...f, modulos: [...cur] };
    });
  };

  const seleccionarTodosModulosForm = () => {
    setForm((f) => ({ ...f, modulos: [...TODOS_LOS_MODULOS] }));
  };

  const limpiarModulosForm = () => {
    setForm((f) => ({ ...f, modulos: [] }));
  };

  const handleCopyForm = () => {
    clipboardUsuarioForm = { ...form };
    alert("¡Usuario copiado al portapapeles! Abre otro usuario y haz clic en 'Pegar'.");
  };

  const handlePasteForm = () => {
    if (!clipboardUsuarioForm) {
      alert("No hay ningún usuario copiado.");
      return;
    }
    setForm((f) => ({
      ...f,
      ...clipboardUsuarioForm,
      nombre: f.nombre, // Keep the current user being edited name
      email: f.email,   // Keep the current user being edited email
      tokenAcceso: f.tokenAcceso || generarTokenAcceso(), // Try to keep their own token if they have one already, otherwise generate new
    }));
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
                <th className="px-4 py-3 font-medium">Módulos</th>
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
                  <td
                    className="px-4 py-3 text-muted max-w-[150px] truncate"
                    title={(item.modulos || []).map((m) => etiquetaModulo(m)).join(", ")}
                  >
                    {(item.modulos || []).length > 0
                      ? (item.modulos || []).map((m) => etiquetaModulo(m)).join(", ")
                      : "—"}
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
            className="rounded-xl border border-border bg-surface-100 p-6 w-full max-w-5xl shadow-xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50 shrink-0">
              <h3 className="text-xl font-medium text-white flex items-center gap-3">
                {editingId ? "Editar usuario" : "Nuevo usuario"}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyForm}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-surface-200 border border-border text-muted hover:text-white hover:bg-surface-50 transition"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={handlePasteForm}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-surface-200 border border-border text-muted hover:text-white hover:bg-surface-50 transition"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Pegar
                </button>
                <div className="w-px h-6 bg-border mx-1"></div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2 pb-4">
                {/* COLUMNA IZQUIERDA: DATOS GENERALES */}
                <div className="space-y-5">
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
                        className="w-32 px-4 py-2 rounded-lg bg-surface-200 border border-border text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej. A1B"
                        maxLength={3}
                      />
                      <span className="text-xs font-semibold text-primary px-2 whitespace-nowrap border border-primary/20 bg-primary/10 rounded-md py-1">
                        3 caracteres
                      </span>
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

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={form.activo}
                      onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                      className="w-5 h-5 rounded border-border bg-surface-200 text-primary focus:ring-primary"
                    />
                    <label htmlFor="activo" className="text-sm font-medium text-white cursor-pointer select-none">
                      Usuario activo (puede usar el sistema)
                    </label>
                  </div>
                </div>

                {/* COLUMNA DERECHA: ACCESOS */}
                <div className="space-y-6">
                  <div className="bg-surface-200/20 p-4 rounded-xl border border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <label className="block font-medium text-white">Bodegas de acceso</label>
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
                      <p className="text-xs text-muted mt-3 leading-relaxed border-t border-border/50 pt-2">
                        Verá dashboards/datos de las bodegas marcadas. (La hoja de Google Sheet se asigna por bodega en la ficha de la empresa, no por usuario).
                      </p>
                    </div>

                  <div className="bg-surface-200/20 p-4 rounded-xl border border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <label className="block font-medium text-white">Módulos permitidos</label>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={seleccionarTodosModulosForm}
                      className="text-xs text-primary hover:underline"
                    >
                      Marcar todos
                    </button>
                    <span className="text-muted text-xs">·</span>
                    <button type="button" onClick={limpiarModulosForm} className="text-xs text-muted hover:text-white">
                      Quitar todos
                    </button>
                  </div>
                </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 mt-2">
                      {modulosOrdenados.map((modulo) => {
                        const checked = (form.modulos || []).includes(modulo);
                        return (
                          <label key={modulo} className={`flex items-center gap-3 px-3 py-2 cursor-pointer border rounded-lg transition-colors ${checked ? 'bg-primary/10 border-primary/30' : 'bg-surface-200/40 border-border hover:bg-surface-200/80'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleModuloEnForm(modulo, e.target.checked)}
                              className="w-4 h-4 rounded border-border bg-surface-200 text-primary focus:ring-primary shrink-0"
                            />
                            <span className={`text-sm ${checked ? 'text-white font-medium' : 'text-white/70'}`}>
                              {etiquetaModulo(modulo)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-5 border-t border-border mt-2 shrink-0">
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
