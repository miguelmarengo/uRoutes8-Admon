/**
 * Mismo orden que `src/lib/usuarioToken.js` — mantener alineado.
 */
export const TOKEN_FIELDS_FIRESTORE = [
  "tokenAcceso",
  "password",
  "token",
  "codigoAcceso",
  "codigo",
];

/** Busca el primer documento cuyo token coincida en tokenAcceso o campos legados. */
export async function findUsuarioSnapshotByToken(db, token) {
  for (const field of TOKEN_FIELDS_FIRESTORE) {
    const snap = await db.collection("usuarios").where(field, "==", token).limit(2).get();
    if (!snap.empty) return snap;
  }
  return null;
}
