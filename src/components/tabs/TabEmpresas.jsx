import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Trash,
  Copy,
  ClipboardPaste,
} from "lucide-react";
import { deleteField } from "firebase/firestore";
import {
  getEmpresas,
  addEmpresa,
  updateEmpresa,
  deleteEmpresa,
} from "../../lib/firestore";
import { APP_VERSION } from "../../lib/version";

let clipboardEmpresaForm = null;

const newBodega = () => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  nombre: "",
  direccion: "",
  ciudad: "",
  estado: "",
  pais: "",
  latitud: "",
  longitud: "",
  telefono: "",
  email: "",
  contactoNombre: "",
  contactoCorreo: "",
  contactoTelefono: "",
  contactoWhatsapp: "",
  googleSheet: "",
});

const ensureBodegaIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((b) => {
    const base = newBodega();
    const id = b.id || base.id;
    const s = (v) => (v == null ? "" : String(v));
    return {
      id,
      nombre: s(b.nombre),
      direccion: s(b.direccion),
      ciudad: s(b.ciudad),
      estado: s(b.estado),
      pais: s(b.pais),
      latitud: b.latitud != null && b.latitud !== "" ? s(b.latitud) : "",
      longitud: b.longitud != null && b.longitud !== "" ? s(b.longitud) : "",
      telefono: s(b.telefono),
      email: s(b.email),
      contactoNombre: s(b.contactoNombre),
      contactoCorreo: s(b.contactoCorreo),
      contactoTelefono: s(b.contactoTelefono),
      contactoWhatsapp: s(b.contactoWhatsapp),
      googleSheet: s(b.googleSheet),
    };
  });

const parseCoord = (v) => {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const bodegaTieneAlgúnDato = (b) => {
  const keys = Object.keys(newBodega()).filter((k) => k !== "id");
  return keys.some((k) => String(b[k] ?? "").trim() !== "");
};

const normalizeBodegasForSave = (bodegas) => {
  const list = [];
  for (const raw of bodegas) {
    if (!bodegaTieneAlgúnDato(raw)) continue;
    const nombre = String(raw.nombre ?? "").trim();
    if (!nombre) {
      return {
        error: "Cada bodega con datos debe tener un nombre. Revisa las tarjetas de bodega.",
      };
    }
    list.push({
      id: raw.id || newBodega().id,
      nombre,
      direccion: String(raw.direccion ?? "").trim() || null,
      ciudad: String(raw.ciudad ?? "").trim() || null,
      estado: String(raw.estado ?? "").trim() || null,
      pais: String(raw.pais ?? "").trim() || null,
      latitud: parseCoord(raw.latitud),
      longitud: parseCoord(raw.longitud),
      telefono: String(raw.telefono ?? "").trim() || null,
      email: String(raw.email ?? "").trim() || null,
      contactoNombre: String(raw.contactoNombre ?? "").trim() || null,
      contactoCorreo: String(raw.contactoCorreo ?? "").trim() || null,
      contactoTelefono: String(raw.contactoTelefono ?? "").trim() || null,
      contactoWhatsapp: String(raw.contactoWhatsapp ?? "").trim() || null,
      googleSheet: String(raw.googleSheet ?? "").trim() || null,
    });
  }
  return { bodegas: list };
};

const BodegaFields = ({ b, index, expanded, onToggle, onChange, onRemove }) => (
  <div className="rounded-lg border border-border bg-surface-200/40 overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-200/80 transition"
    >
      <span className="flex items-center gap-2 min-w-0">
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm text-white truncate">
          Bodega {index + 1}
          {b.nombre?.trim() ? ` — ${b.nombre.trim()}` : ""}
        </span>
      </span>
      <span className="flex items-center gap-1 shrink-0 text-muted">
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    </button>
    {expanded && (
      <div className="px-3 pb-3 pt-0 space-y-4 border-t border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Nombre de la bodega</label>
            <input
              type="text"
              value={b.nombre}
              onChange={(e) => onChange("nombre", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej. Centro Norte"
            />
          </div>
        </div>
        <fieldset className="space-y-3 border border-border/50 rounded-lg p-3">
          <legend className="text-xs font-medium text-primary px-1">Ubicación</legend>
          <div>
            <label className="block text-xs text-muted mb-1">Dirección</label>
            <input
              type="text"
              value={b.direccion}
              onChange={(e) => onChange("direccion", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Ciudad</label>
              <input
                type="text"
                value={b.ciudad}
                onChange={(e) => onChange("ciudad", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Estado</label>
              <input
                type="text"
                value={b.estado}
                onChange={(e) => onChange("estado", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">País</label>
              <input
                type="text"
                value={b.pais}
                onChange={(e) => onChange("pais", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Latitud</label>
              <input
                type="text"
                inputMode="decimal"
                value={b.latitud}
                onChange={(e) => onChange("latitud", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="19.4326"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Longitud</label>
              <input
                type="text"
                inputMode="decimal"
                value={b.longitud}
                onChange={(e) => onChange("longitud", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="-99.1332"
              />
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-3 border border-border/50 rounded-lg p-3">
          <legend className="text-xs font-medium text-primary px-1">Contacto general (bodega)</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Teléfono</label>
              <input
                type="text"
                value={b.telefono}
                onChange={(e) => onChange("telefono", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Correo</label>
              <input
                type="email"
                value={b.email}
                onChange={(e) => onChange("email", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-3 border border-border/50 rounded-lg p-3">
          <legend className="text-xs font-medium text-primary px-1">Persona de contacto</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Nombre</label>
              <input
                type="text"
                value={b.contactoNombre}
                onChange={(e) => onChange("contactoNombre", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Correo</label>
              <input
                type="email"
                value={b.contactoCorreo}
                onChange={(e) => onChange("contactoCorreo", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Teléfono</label>
              <input
                type="text"
                value={b.contactoTelefono}
                onChange={(e) => onChange("contactoTelefono", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">WhatsApp</label>
              <input
                type="text"
                value={b.contactoWhatsapp}
                onChange={(e) => onChange("contactoWhatsapp", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+52 …"
              />
            </div>
          </div>
        </fieldset>
        <div>
          <label className="block text-xs text-muted mb-1">Google Sheet de esta bodega</label>
          <p className="text-[11px] text-muted mb-1.5">
            ID o URL del spreadsheet que usarán los sistemas para esta ubicación.
          </p>
          <input
            type="text"
            value={b.googleSheet}
            onChange={(e) => onChange("googleSheet", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="ID de la hoja o enlace completo"
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            <Trash className="w-3.5 h-3.5" />
            Quitar bodega
          </button>
        </div>
      </div>
    )}
  </div>
);

export const TabEmpresas = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [bodegas, setBodegas] = useState([]);
  const [expandedBodegaIds, setExpandedBodegaIds] = useState(() => new Set());
  const [form, setForm] = useState({
    nombre: "",
    firebaseConfigJson: "",
    llaves: "",
    firebaseServiceAccountJson: "",
    googleSheetServiceAccountJson: "",
  });
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

  const resetModalUi = () => {
    setBodegas([]);
    setExpandedBodegaIds(new Set());
  };

  const openCreate = () => {
    setEditingId(null);
    resetModalUi();
    setForm({
      nombre: "",
      firebaseConfigJson: "",
      llaves: "",
      firebaseServiceAccountJson: "",
      googleSheetServiceAccountJson: "",
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    resetModalUi();
    const config = item.firebaseConfig;
    setForm({
      nombre: item.nombre ?? "",
      firebaseConfigJson: config ? JSON.stringify(config, null, 2) : "",
      llaves: item.llaves ?? "",
      firebaseServiceAccountJson: item.firebaseServiceAccountJson ?? item.serviceAccountJson ?? "",
      googleSheetServiceAccountJson: item.googleSheetServiceAccountJson ?? "",
    });
    const raw = ensureBodegaIds(item.bodegas);
    setBodegas(raw);
    setExpandedBodegaIds(new Set(raw.map((x) => x.id)));
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    resetModalUi();
    setForm({
      nombre: "",
      firebaseConfigJson: "",
      llaves: "",
      firebaseServiceAccountJson: "",
      googleSheetServiceAccountJson: "",
    });
  };

  const handleCopyForm = () => {
    clipboardEmpresaForm = {
      firebaseConfigJson: form.firebaseConfigJson,
      llaves: form.llaves,
      firebaseServiceAccountJson: form.firebaseServiceAccountJson,
      googleSheetServiceAccountJson: form.googleSheetServiceAccountJson,
      bodegas: typeof structuredClone === "function" ? structuredClone(bodegas) : JSON.parse(JSON.stringify(bodegas))
    };
    alert("Configuración de empresa copiada. Puedes pegarla en otra.");
  };

  const handlePasteForm = () => {
    if (!clipboardEmpresaForm) {
      alert("No hay configuración copiada en memoria.");
      return;
    }
    const currentName = form.nombre;
    setForm({
      ...clipboardEmpresaForm,
      nombre: currentName
    });
    
    // Asignamos nuevos IDs aleatorios a las bodegas pegadas
    const newBodegas = (clipboardEmpresaForm.bodegas || []).map(b => ({
      ...b,
      id: crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    }));
    
    setBodegas(newBodegas);
    setExpandedBodegaIds(new Set(newBodegas.map(b => b.id)));
  };

  const toggleBodegaExpanded = (id) => {
    setExpandedBodegaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateBodega = (id, field, value) => {
    setBodegas((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addBodega = () => {
    const nb = newBodega();
    setBodegas((r) => [...r, nb]);
    setExpandedBodegaIds((prev) => new Set(prev).add(nb.id));
  };

  const removeBodega = (id) => {
    setBodegas((r) => r.filter((x) => x.id !== id));
    setExpandedBodegaIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const validateStep1 = () => {
    if (!form.nombre?.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return false;
    }
    const firebaseConfig = parseFirebaseConfig(form.firebaseConfigJson);
    if (form.firebaseConfigJson?.trim() && firebaseConfig === undefined) {
      setError("El JSON de Firebase no es válido. Revisa la sintaxis.");
      return false;
    }
    setError(null);
    return true;
  };

  const persistEmpresa = async () => {
    if (!form.nombre?.trim()) return;
    const firebaseConfig = parseFirebaseConfig(form.firebaseConfigJson);
    if (form.firebaseConfigJson?.trim() && firebaseConfig === undefined) {
      setError("El JSON de Firebase no es válido. Revisa la sintaxis.");
      return;
    }
    const norm = normalizeBodegasForSave(bodegas);
    if (norm.error) {
      setError(norm.error);
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
      const payloadCommon = {
        nombre: form.nombre.trim(),
        llaves: form.llaves.trim(),
        firebaseServiceAccountJson: form.firebaseServiceAccountJson.trim(),
        googleSheetServiceAccountJson: form.googleSheetServiceAccountJson.trim(),
        bodegas: norm.bodegas,
      };

      const savePromise = (async () => {
        if (editingId) {
          await updateEmpresa(editingId, {
            ...payloadCommon,
            firebaseConfig: firebaseConfig === null ? deleteField() : firebaseConfig,
          });
        } else {
          await addEmpresa({
            ...payloadCommon,
            ...(firebaseConfig != null && { firebaseConfig }),
          });
        }
      })();
      await Promise.race([savePromise, timeoutPromise]);
      closeModal();
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await persistEmpresa();
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

  const isCreate = !editingId;

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

      {error && !modalOpen && (
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
                <th className="px-4 py-3 font-medium text-center">Bodegas</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Firebase</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Firebase SA</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Sheets SA</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Llaves</th>
                <th className="px-4 py-3 font-medium w-28 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-border">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">{item.nombre || "—"}</td>
                  <td className="px-4 py-3 text-center text-muted">
                    {Array.isArray(item.bodegas) ? item.bodegas.length : 0}
                  </td>
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
                    {(item.firebaseServiceAccountJson?.trim() || item.serviceAccountJson?.trim()) ? (
                      <span className="inline-flex items-center gap-1 text-primary" title="Firebase Service Account configurada">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.googleSheetServiceAccountJson?.trim() ? (
                      <span className="inline-flex items-center gap-1 text-primary" title="Google Sheets Service Account configurada">
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
            className="rounded-xl border border-border bg-surface-100 p-6 w-full max-w-5xl shadow-xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50 shrink-0">
              <h3 className="text-xl font-medium text-white flex items-center gap-3">
                {editingId ? "Editar empresa" : "Nueva empresa"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyForm}
                  className="px-3 py-1.5 flex items-center gap-2 rounded-lg bg-surface-200 text-sm text-white hover:bg-surface-300 transition"
                  title="Copiar configuración (ideal para multi-entorno)"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteForm}
                  className="px-3 py-1.5 flex items-center gap-2 rounded-lg bg-surface-200 text-sm text-white hover:bg-surface-300 transition"
                  title="Pegar configuración de otra empresa"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Pegar</span>
                </button>
                <div className="w-px h-6 bg-border/50 mx-2" />
                <button
                  disabled={saving}
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-50 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm shrink-0">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
              <form id="form-empresa" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-1">Datos Generales e Integraciones</h4>
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Nombre</label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nombre de la empresa"
                      autoFocus={isCreate}
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
                      Firebase JSON Service Account
                    </label>
                    <p className="text-xs text-muted mb-2">
                      Pega el JSON de la Service Account para Firebase.
                    </p>
                    <textarea
                      value={form.firebaseServiceAccountJson}
                      onChange={(e) => setForm((f) => ({ ...f, firebaseServiceAccountJson: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs min-h-[100px] resize-y"
                      placeholder='{"type": "service_account", ...}'
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">
                      Google Sheet JSON Service Account
                    </label>
                    <p className="text-xs text-muted mb-2">
                      Pega el JSON de la Service Account con permisos para Google Sheets (compartida por la empresa; cada bodega tiene su propia hoja abajo).
                    </p>
                    <textarea
                      value={form.googleSheetServiceAccountJson}
                      onChange={(e) => setForm((f) => ({ ...f, googleSheetServiceAccountJson: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg bg-surface-200 border border-border text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs min-h-[100px] resize-y"
                      placeholder='{"type": "service_account", ...}'
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
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-primary">Bodegas Operativas</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Cada bodega necesita al menos un nombre. Puedes añadir tantas como instalaciones maneje el sistema de esta empresa.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {bodegas.map((b, index) => (
                      <BodegaFields
                        key={b.id}
                        b={b}
                        index={index}
                        expanded={expandedBodegaIds.has(b.id)}
                        onToggle={() => toggleBodegaExpanded(b.id)}
                        onChange={(field, v) => updateBodega(b.id, field, v)}
                        onRemove={() => removeBodega(b.id)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addBodega}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir otra bodega
                  </button>
                </div>
              </form>
            </div>

            <div className="flex justify-between items-center gap-3 pt-4 mt-2 border-t border-border/50 shrink-0">
              {APP_VERSION ? (
                <span className="text-[11px] font-mono text-muted" title="Versión del build">
                  v{APP_VERSION}
                </span>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-muted hover:text-white hover:bg-surface-50 transition"
                >
                  Cancelar
                </button>
                <button
                  form="form-empresa"
                  type="submit"
                  disabled={saving || !form.nombre?.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-black font-medium hover:bg-primary-hover transition disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  {saving ? "Guardando…" : "Guardar empresa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
