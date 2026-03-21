/**
 * IDs de bodega a las que el usuario tiene acceso (nuevo: `bodegaIds`; legado: `bodegaId`).
 * @param {Record<string, unknown>} usuario
 * @returns {string[]}
 */
export function collectUsuarioBodegaIds(usuario) {
  const raw = usuario?.bodegaIds;
  if (Array.isArray(raw) && raw.length > 0) {
    return [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))];
  }
  const legacy = usuario?.bodegaId;
  if (legacy != null && String(legacy).trim()) {
    return [String(legacy).trim()];
  }
  return [];
}

/**
 * Formato de respuesta para login por `tokenAcceso` (apps de campo, APIs, Cloud Function).
 * No incluye secretos de empresa. `bodegas` solo contiene las que el usuario puede usar.
 *
 * @param {{ id: string } & Record<string, unknown>} usuario
 * @param {{ id: string, nombre?: string, bodegas?: unknown[] } | null} empresa
 */
export function buildClienteLoginResponse(usuario, empresa) {
  const todas = Array.isArray(empresa?.bodegas) ? empresa.bodegas : [];
  const allowedIds = new Set(collectUsuarioBodegaIds(usuario));
  const bodegas =
    allowedIds.size > 0
      ? todas.filter((b) => b && typeof b === "object" && b.id && allowedIds.has(b.id))
      : [];

  const bodegaIds = [...allowedIds];

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre ?? null,
      email: usuario.email ?? null,
      empresaId: usuario.empresaId ?? null,
      bodegaIds,
      activo: usuario.activo !== false,
    },
    empresa: empresa
      ? { id: empresa.id, nombre: empresa.nombre ?? null }
      : null,
    /** Solo bodegas a las que el usuario tiene acceso (dashboards / hojas). */
    bodegas,
    /** Compatibilidad: primera bodega accesible. Preferir `bodegas`. */
    bodegaSeleccionada: bodegas[0] ?? null,
    /** Compatibilidad: hoja de la primera bodega accesible. */
    googleSheet: bodegas[0]?.googleSheet ?? null,
  };
}
