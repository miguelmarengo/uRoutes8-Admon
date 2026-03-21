/**
 * Copiar a tu proyecto TypeScript / React / Vue.
 * Mantener alineado con docs/LOGIN_UNIFICADO_MODULOS.md y src/lib/clienteSesion.js
 */

export interface LoginUsuarioPublico {
  id: string;
  nombre: string | null;
  email: string | null;
  empresaId: string | null;
  bodegaIds: string[];
  activo: boolean;
}

export interface LoginEmpresaPublica {
  id: string;
  nombre: string | null;
}

/** Bodega tal como viene en Firestore / respuesta (campos opcionales según datos). */
export interface LoginBodega {
  id: string;
  nombre?: string | null;
  googleSheet?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  pais?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  telefono?: string | null;
  email?: string | null;
  contactoNombre?: string | null;
  contactoCorreo?: string | null;
  contactoTelefono?: string | null;
  contactoWhatsapp?: string | null;
  [key: string]: unknown;
}

export interface LoginClienteResponse {
  usuario: LoginUsuarioPublico;
  empresa: LoginEmpresaPublica | null;
  /** Solo bodegas a las que el usuario tiene acceso. */
  bodegas: LoginBodega[];
  /** @deprecated Preferir bodegas + bodegaActivaId en sesión. */
  bodegaSeleccionada?: LoginBodega | null;
  /** @deprecated Usar la hoja de la bodega activa elegida por el usuario. */
  googleSheet?: string | null;
}

export interface UroutesSessionV1 {
  version: 1;
  savedAt: string;
  /** URL del POST loginCliente usada (recomendado para re-login o otros entornos). */
  loginClienteUrl?: string;
  contexto?: {
    empresaTexto?: string | null;
    usuarioTexto?: string | null;
  };
  usuario: LoginUsuarioPublico;
  empresa: LoginEmpresaPublica | null;
  bodegas: LoginBodega[];
  bodegaActivaId: string;
}

const SESSION_KEY = "uroutes.session.v1";

export function readUroutesSession(): UroutesSessionV1 | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as UroutesSessionV1;
    if (o?.version !== 1 || !o.bodegaActivaId) return null;
    return o;
  } catch {
    return null;
  }
}

export async function loginCliente(
  loginUrl: string,
  tokenAcceso: string
): Promise<LoginClienteResponse> {
  const token = String(tokenAcceso).replace(/[^a-zA-Z0-9]/g, "").slice(0, 3);
  const res = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenAcceso: token }),
  });
  const data = (await res.json()) as LoginClienteResponse & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    (err as Error & { code?: string }).code = data.code;
    throw err;
  }
  return data;
}
