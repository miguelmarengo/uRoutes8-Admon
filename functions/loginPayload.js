/**
 * Copia de la lógica en `src/lib/clienteSesion.js` para Cloud Functions.
 * Mantener alineado con `src/lib/clienteSesion.js`.
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
    bodegas,
    bodegaSeleccionada: bodegas[0] ?? null,
    googleSheet: bodegas[0]?.googleSheet ?? null,
  };
}
