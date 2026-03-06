import {
  collection,
  getDocs,
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

const COL_EMPRESAS = "empresas";
const COL_USUARIOS = "usuarios";
const COL_BITACORA = "bitacora";

export const getEmpresas = async () => {
  const snap = await getDocs(
    query(collection(db, COL_EMPRESAS), orderBy("nombre"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
