import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { buildClienteLoginResponse } from "./clienteSesion";
import { TOKEN_FIELDS_FIRESTORE, normalizarTokenAcceso } from "./usuarioToken";

/**
 * Empresas (`empresas/{id}`): campo opcional `bodegas` (array de objetos).
 * Cada bodega debe incluir `id` estable, datos de ubicación/contacto y `googleSheet`
 * (ID o URL del spreadsheet). Los módulos que autentiquen por `usuarios.tokenAcceso`
 * deben cargar el usuario, su `empresaId` y la empresa con `bodegas` para exponer
 * la hoja correcta por bodega (el campo `sheet` en `usuarios` queda obsoleto).
 *
 * Usuarios (`usuarios/{id}`): `bodegaIds` (array de ids de `empresas.bodegas[]`) =
 * únicas bodegas que verá en dashboards. `tokenAcceso` (3 caracteres) es el login;
 * el panel y loginCliente también leen legado: `password`, `token`, `codigoAcceso`, `codigo`.
 * Al guardar desde el admin se normaliza a `tokenAcceso`. Legado: `bodegaId` en lectura de bodegas.
 */
const COL_EMPRESAS = "empresas";
const COL_USUARIOS = "usuarios";
const COL_BITACORA = "bitacora";

export const getEmpresas = async () => {
  const snap = await getDocs(
    query(collection(db, COL_EMPRESAS), orderBy("nombre"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getEmpresaById = async (id) => {
  if (!id) return null;
  const s = await getDoc(doc(db, COL_EMPRESAS, id));
  if (!s.exists()) return null;
  return { id: s.id, ...s.data() };
};

/**
 * Busca usuarios por token en `tokenAcceso` y campos legados (`password`, `token`, etc.).
 * Requiere sesión según reglas de Firestore (p. ej. solo admin en este proyecto).
 */
export const getUsuariosByTokenAcceso = async (tokenRaw) => {
  const token = normalizarTokenAcceso(tokenRaw);
  if (token.length !== 3) return [];
  const byId = new Map();
  for (const field of TOKEN_FIELDS_FIRESTORE) {
    const snap = await getDocs(
      query(collection(db, COL_USUARIOS), where(field, "==", token))
    );
    for (const d of snap.docs) {
      if (!byId.has(d.id)) byId.set(d.id, { id: d.id, ...d.data() });
    }
  }
  return [...byId.values()];
};

/**
 * Resuelve usuario + empresa y devuelve el mismo JSON que debe exponer la Cloud Function `loginCliente`.
 * Útil para pruebas desde el admin (con sesión). Las apps de campo deben llamar a la función HTTP.
 */
export const resolveClienteSesionPorTokenAcceso = async (tokenRaw) => {
  const matches = await getUsuariosByTokenAcceso(tokenRaw);
  if (matches.length === 0) {
    const err = new Error("Token no válido");
    err.code = "AUTH_TOKEN_INVALID";
    throw err;
  }
  const usuario = matches[0];
  if (usuario.activo === false) {
    const err = new Error("Usuario inactivo");
    err.code = "AUTH_USER_INACTIVE";
    throw err;
  }
  if (!usuario.empresaId) {
    return buildClienteLoginResponse(usuario, null);
  }
  const empresa = await getEmpresaById(usuario.empresaId);
  return buildClienteLoginResponse(usuario, empresa);
};

const sanitizeForFirestore = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = typeof v === "object" && v !== null && !(v instanceof Date) && !("toMillis" in v)
      ? sanitizeForFirestore(v)
      : v;
  }
  return out;
};

export const addEmpresa = async (data) => {
  if (!auth.currentUser) {
    throw new Error("No hay sesión. Cierra y vuelve a iniciar sesión.");
  }
  const clean = sanitizeForFirestore({ ...data });
  const ref = await addDoc(collection(db, COL_EMPRESAS), {
    ...clean,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateEmpresa = async (id, data) => {
  if (!auth.currentUser) {
    throw new Error("No hay sesión. Cierra y vuelve a iniciar sesión.");
  }
  await updateDoc(doc(db, COL_EMPRESAS, id), data);
};

export const deleteEmpresa = async (id) => {
  await deleteDoc(doc(db, COL_EMPRESAS, id));
};

export const getUsuarios = async (empresaId = null) => {
  let q = collection(db, COL_USUARIOS);
  if (empresaId) {
    q = query(q, where("empresaId", "==", empresaId));
  } else {
    q = query(q, orderBy("nombre"));
  }
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (empresaId) list.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  return list;
};

export const addUsuario = async (data) => {
  const ref = await addDoc(collection(db, COL_USUARIOS), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateUsuario = async (id, data) => {
  await updateDoc(doc(db, COL_USUARIOS, id), data);
};

export const deleteUsuario = async (id) => {
  await deleteDoc(doc(db, COL_USUARIOS, id));
};

export const getBitacora = async (filters = {}) => {
  let q = query(
    collection(db, COL_BITACORA),
    orderBy("timestamp", "desc")
  );
  if (filters.empresaId) {
    q = query(q, where("empresaId", "==", filters.empresaId));
  }
  if (filters.usuarioId) {
    q = query(q, where("usuarioId", "==", filters.usuarioId));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
