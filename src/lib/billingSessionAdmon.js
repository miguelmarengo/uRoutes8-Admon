import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../config/firebase";

const COL = "billing_events";

function periodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

let lastAt = 0;
const THROTTLE_MS = 30 * 60 * 1000;

/**
 * Registra sesión del panel Admon en billing_events (misma colección que webFacturación).
 * Requiere reglas Firestore que permitan create autenticado.
 */
export async function recordAdmonPanelSession() {
  if (!auth.currentUser?.email) return;
  const now = Date.now();
  if (now - lastAt < THROTTLE_MS) return;
  lastAt = now;
  await addDoc(collection(db, COL), {
    empresaId: null,
    empresaNombre: null,
    usuarioId: null,
    usuarioEmail: auth.currentUser.email,
    moduleId: "admon",
    product: "firestore",
    actionType: "panel_session",
    hits: 1,
    units: 0,
    sourceApp: "webAdmon",
    estimatedCostUsd: null,
    periodKey: periodKey(),
    createdAt: serverTimestamp(),
  });
}
