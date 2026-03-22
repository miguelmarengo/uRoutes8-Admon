/**
 * Acceso provisional al panel (sin Firebase Auth).
 * Sustituir por auth real cuando toque.
 */
const USERS = {
  gaby: "ggG",
  maria: "mMm",
  mm: "mmm",
};

/**
 * @param {string} username
 * @param {string} password
 * @returns {{ username: string } | null}
 */
export function validateAdmonHardcodedLogin(username, password) {
  const u = String(username ?? "").trim();
  const p = String(password ?? "");
  const expected = USERS[u];
  if (expected === undefined || expected !== p) return null;
  return { username: u };
}

/** Usuarios válidos (sesión guardada solo con usuario; al recargar se comprueba que siga siendo uno de estos). */
export function isAdmonHardcodedUsername(username) {
  const u = String(username ?? "").trim();
  return Object.prototype.hasOwnProperty.call(USERS, u);
}
