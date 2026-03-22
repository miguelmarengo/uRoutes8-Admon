/**
 * Campos en Firestore donde históricamente pudo guardarse el token de acceso.
 * El canónico es `tokenAcceso` (3 caracteres alfanuméricos). El login y el panel
 * leen cualquiera de estos; al guardar desde el admin siempre se escribe `tokenAcceso`.
 */
export const TOKEN_FIELDS_FIRESTORE = [
  "tokenAcceso",
  "password",
  "token",
  "codigoAcceso",
  "codigo",
];

export function normalizarTokenAcceso(tokenRaw) {
  return String(tokenRaw ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3);
}

/** Primer valor no vacío entre campos legados, normalizado a máx. 3 caracteres. */
export function leerTokenDesdeUsuario(doc) {
  if (!doc || typeof doc !== "object") return "";
  for (const key of TOKEN_FIELDS_FIRESTORE) {
    const v = doc[key];
    if (v != null && String(v).trim()) {
      return normalizarTokenAcceso(String(v));
    }
  }
  return "";
}

export function usuarioTieneTokenValido(doc) {
  return leerTokenDesdeUsuario(doc).length === 3;
}
