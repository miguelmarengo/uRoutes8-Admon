import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildClienteLoginResponse } from "./loginPayload.js";
import { findUsuarioSnapshotByToken } from "./tokenLookup.js";

initializeApp();
const db = getFirestore();

const normalizeTokenAcceso = (tokenRaw) =>
  String(tokenRaw ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3);

export const loginCliente = onRequest(
  { cors: true, region: "us-central1", invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({
        error: "Método no permitido",
        hint: 'POST JSON: { "tokenAcceso": "abc" }',
      });
      return;
    }

    const token = normalizeTokenAcceso(req.body?.tokenAcceso ?? req.body?.token);
    if (token.length !== 3) {
      res.status(400).json({ code: "AUTH_TOKEN_BAD_FORMAT", error: "tokenAcceso debe ser 3 caracteres" });
      return;
    }

    try {
      const snap = await findUsuarioSnapshotByToken(db, token);
      if (!snap || snap.empty) {
        res.status(401).json({ code: "AUTH_TOKEN_INVALID", error: "Token no válido" });
        return;
      }
      if (snap.size > 1) {
        res.status(409).json({
          code: "AUTH_TOKEN_AMBIGUOUS",
          error: "Hay más de un usuario con este token; corrige datos en Firestore",
        });
        return;
      }

      const doc = snap.docs[0];
      const usuario = { id: doc.id, ...doc.data() };

      if (usuario.activo === false) {
        res.status(403).json({ code: "AUTH_USER_INACTIVE", error: "Usuario inactivo" });
        return;
      }

      let empresa = null;
      if (usuario.empresaId) {
        const eSnap = await db.collection("empresas").doc(usuario.empresaId).get();
        if (eSnap.exists) empresa = { id: eSnap.id, ...eSnap.data() };
      }

      res.status(200).json(buildClienteLoginResponse(usuario, empresa));
    } catch (e) {
      console.error("loginCliente", e);
      res.status(500).json({ error: "Error interno" });
    }
  }
);
