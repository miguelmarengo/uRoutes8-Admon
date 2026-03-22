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

function normBodegaId(id) {
  return String(id ?? "")
    .trim()
    .toLowerCase();
}

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
    bodegas,
    bodegaSeleccionada: bodegas[0] ?? null,
    googleSheet: bodegas[0]?.googleSheet ?? null,
  };
}
