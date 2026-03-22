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

/** Misma regla que Optimizador (`_norm_bodega_id`): comparar UUID sin depender de mayúsculas. */
function normBodegaId(id) {
  return String(id ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Bodega pública para JSON de login (sin credenciales de empresa).
 * @param {Record<string, unknown>} b
 */
function mapBodegaForCliente(b) {
  if (!b || typeof b !== "object") return null;
  const id = String(b.id ?? "").trim();
  if (!id) return null;
  const gs = b.googleSheet ?? b.google_sheet;
  return {
    id,
    nombre: b.nombre ?? null,
    direccion: b.direccion ?? null,
    ciudad: b.ciudad ?? null,
    estado: b.estado ?? null,
    pais: b.pais ?? null,
    latitud: b.latitud ?? null,
    longitud: b.longitud ?? null,
    telefono: b.telefono ?? null,
    email: b.email ?? null,
    contactoNombre: b.contactoNombre ?? null,
    contactoCorreo: b.contactoCorreo ?? null,
    contactoTelefono: b.contactoTelefono ?? null,
    contactoWhatsapp: b.contactoWhatsapp ?? null,
    googleSheet: gs != null && String(gs).trim() ? String(gs).trim() : null,
  };
}

/**
 * Formato de respuesta para login por `tokenAcceso` (apps de campo, APIs, Cloud Function).
 * No incluye secretos de empresa (firebaseConfig, service accounts).
 * `bodegas` = solo bodegas a las que el usuario tiene acceso (`bodegaIds` o legado `bodegaId`),
 * cruzadas con el catálogo de la empresa; ids comparados en minúsculas (UUID).
 * Sin asignación en usuario → `bodegas` vacío (aunque la empresa tenga bodegas).
 *
 * @param {{ id: string } & Record<string, unknown>} usuario
 * @param {{ id: string, nombre?: string, bodegas?: unknown[], googleMapsApiKey?: string, google_maps_api_key?: string } | null} empresa
 */
export function buildClienteLoginResponse(usuario, empresa) {
  const rawList = Array.isArray(empresa?.bodegas) ? empresa.bodegas : [];
  const catalogo = rawList.map(mapBodegaForCliente).filter(Boolean);

  const allowedRaw = collectUsuarioBodegaIds(usuario);
  const allowedLower = new Set(allowedRaw.map(normBodegaId));

  const bodegas =
    allowedLower.size > 0
      ? catalogo.filter((b) => allowedLower.has(normBodegaId(b.id)))
      : [];

  const bodegaIds = [...allowedRaw];

  const mapsKey =
    empresa?.googleMapsApiKey != null && String(empresa.googleMapsApiKey).trim()
      ? String(empresa.googleMapsApiKey).trim()
      : empresa?.google_maps_api_key != null && String(empresa.google_maps_api_key).trim()
        ? String(empresa.google_maps_api_key).trim()
        : null;

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
      ? {
          id: empresa.id,
          nombre: empresa.nombre ?? null,
          ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}),
        }
      : null,
    /** Solo bodegas asignadas al usuario en el panel (`bodegaIds` / `bodegaId`). */
    bodegas,
    /** Compatibilidad: primera bodega accesible. Preferir `bodegas`. */
    bodegaSeleccionada: bodegas[0] ?? null,
    /** Compatibilidad: hoja de la primera bodega accesible. */
    googleSheet: bodegas[0]?.googleSheet ?? null,
  };
}
