import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle } from "lucide-react";
import { deleteField } from "firebase/firestore";
import {
  getEmpresas,
  addEmpresa,
  updateEmpresa,
  deleteEmpresa,
} from "../../lib/firestore";

export const TabEmpresas = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: "", firebaseConfigJson: "", llaves: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const parseFirebaseConfig = (str) => {
    const trimmed = str?.trim();
    if (!trimmed) return null;
    try {
      let toParse = trimmed;

      const configMatch = trimmed.match(/\bfirebaseConfig\s*=\s*\{/i);
      if (configMatch) {
        const start = trimmed.indexOf("{", configMatch.index);
        let depth = 0;
        let end = -1;
        for (let i = start; i < trimmed.length; i++) {
          if (trimmed[i] === "{") depth++;
          if (trimmed[i] === "}") {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
        if (end !== -1) toParse = trimmed.slice(start, end + 1);
      } else {
        toParse = trimmed
          .replace(/^(?:const|var|let)\s+\w+\s*=\s*/i, "")
          .replace(/;\s*$/, "");
      }

      toParse = toParse.replace(
        /\b(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId)\s*:/g,
        '"$1": '
      );

      const obj = JSON.parse(toParse);
      if (!obj || typeof obj !== "object") return null;
      return obj;
    } catch {
      return undefined;
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmpresas();
      setList(data);
    } catch (e) {
      setError(e?.message || "Error al cargar empresas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nombre: "", firebaseConfigJson: "", llaves: "" });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    const config = item.firebaseConfig;
    setForm({
      nombre: item.nombre ?? "",
      firebaseConfigJson: config ? JSON.stringify(config, null, 2) : "",
      llaves: item.llaves ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ nombre: "", firebaseConfigJson: "", llaves: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim()) return;
    const firebaseConfig = parseFirebaseConfig(form.firebaseConfigJson);
    if (form.firebaseConfigJson?.trim() && firebaseConfig === undefined) {
      setError("El JSON de Firebase no es válido. Revisa la sintaxis.");
      return;
    }
    setSaving(true);
    setError(null);
    const TIMEOUT_MS = 12000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Firestore no respondió a tiempo. Lo más habitual: las reglas no permiten escribir. En Firebase Console (proyecto de ESTE admin) → Firestore → Reglas, copia el contenido del archivo firestore.rules de este proyecto y publícalo."
            )
          ),
        TIMEOUT_MS
      )
    );
    try {
      if (typeof console !== "undefined" && console.log) {
        const proj = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        console.log("[Empresas] Enviando escritura a Firestore. Proyecto:", proj || "(revisa .env.local)");
      }
      const savePromise = (async () => {
        if (editingId) {
          await updateEmpresa(editingId, {
            nombre: form.nombre.trim(),
            llaves: form.llaves.trim(),
            firebaseConfig: firebaseConfig === null ? deleteField() : firebaseConfig,
          });
        } else {
          await addEmpresa({
            nombre: form.nombre.trim(),
            llaves: form.llaves.trim(),
            ...(firebaseConfig != null && { firebaseConfig }),
          });
        }
      })();
      await Promise.race([savePromise, timeoutPromise]);
      if (typeof console !== "undefined" && console.log) {
        console.log("[Empresas] Escritura OK. Recargando lista...");
      }
      closeModal();
      setSaving(false);
      load().catch((err) => {
        setError(err?.message || "Error al recargar la lista");
        if (typeof console !== "undefined" && console.error) console.error("[Empresas] Error al recargar", err);
      });
    } catch (e) {
      const code = e?.code ?? e?.cause?.code;
      const msg = e?.message ?? e?.cause?.message ?? "Error al guardar";
      const text = code ? `${code}: ${msg}` : msg;
      setError(text);
      if (typeof console !== "undefined" && console.error) {
        console.error("[Empresas] Error Firestore", e);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta empresa?")) return;
    setDeletingId(id);
    try {
      await deleteEmpresa(id);
      await load();
    } catch (e) {
      setError(e?.message || "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg font-medium text-white">Empresas</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-medium hover:bg-primary-hover transition shrink-0"
        >
          <Plus className="w-5 h-5" />
          Nueva empresa
        </button>
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
        <p className="text-muted text-sm py-8">No hay empresas. Crea la primera.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-200 text-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Firebase</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Llaves</th>
                <th className="px-4 py-3 font-medium w-28 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-border">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">{item.nombre || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {item.firebaseConfig?.projectId ? (
                      <span className="inline-flex items-center gap-1 text-primary" title="Proyecto configurado">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.llaves?.trim() ? (
                      <span className="inline-flex items-center gap-1 text-primary" title="Llaves configuradas">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={closeModal}>
          <div
            className="rounded-xl border border-border bg-surface-100 p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {editingId ? "Editar empresa" : "Nueva empresa"}
              </h3>
              <button
                disabled={saving}
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre de la empresa"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Configuración Firebase (proyecto de la empresa)
                </label>
                <p className="text-xs text-muted mb-2">
                  Pega el JSON que te da Firebase (Configuración del proyecto → Tus apps). Así tus aplicaciones podrán conectarse al Firestore y Storage de esta empresa.
                </p>
                <textarea
                  value={form.firebaseConfigJson}
                  onChange={(e) => setForm((f) => ({ ...f, firebaseConfigJson: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs min-h-[100px] resize-y"
                  placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Llaves / Credenciales Extra (Texto multilínea)
                </label>
                <textarea
                  value={form.llaves}
                  onChange={(e) => setForm((f) => ({ ...f, llaves: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs min-h-[140px] resize-y"
                  placeholder="Pega aquí cualquier configuración adicional, llaves de API, o texto de muchos renglones..."
                  spellCheck={false}
                />
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
                  className="px-4 py-2 rounded-lg bg-primary text-black font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2 min-w-[100px]"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  {saving ? "Guardando…" : editingId ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
