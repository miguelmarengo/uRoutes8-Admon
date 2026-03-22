import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../../config/firebase";
import {
  validateAdmonHardcodedLogin,
  isAdmonHardcodedUsername,
} from "../lib/admonHardcodedAuth";

const SESSION_KEY = "uroutes.admon.session.v1";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
};

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const username = typeof o?.username === "string" ? o.username.trim() : "";
    if (!username || !isAdmonHardcodedUsername(username)) return null;
    return { username };
  } catch {
    return null;
  }
}

function panelFirebaseEmail() {
  return String(import.meta.env.VITE_FIREBASE_PANEL_EMAIL ?? "").trim();
}

function panelFirebasePassword() {
  return String(import.meta.env.VITE_FIREBASE_PANEL_PASSWORD ?? "");
}

/** Asegura usuario Firebase para Firestore (reglas: request.auth != null). */
async function ensureFirebaseForPanel() {
  const email = panelFirebaseEmail();
  const password = panelFirebasePassword();
  if (!email || !password) {
    const err = new Error(
      "Configura VITE_FIREBASE_PANEL_EMAIL y VITE_FIREBASE_PANEL_PASSWORD en .env.local (usuario Email/Password en Firebase Console).",
    );
    err.code = "AUTH_PANEL_ENV_MISSING";
    throw err;
  }

  await auth.authStateReady().catch(() => {});

  const current = auth.currentUser;
  const same =
    current?.email && current.email.toLowerCase() === email.toLowerCase();

  if (!same) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  await auth.currentUser?.getIdToken(true);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fu) => {
      setFirebaseUser(fu);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await auth.authStateReady().catch(() => {});
      if (cancelled) return;

      const stored = readStoredSession();
      if (!stored) {
        try {
          await firebaseSignOut(auth);
        } catch {
          /* ignore */
        }
        if (!cancelled) setLoading(false);
        return;
      }

      setUser({
        uid: stored.username,
        displayName: stored.username,
      });

      try {
        await ensureFirebaseForPanel();
      } catch (e) {
        if (!cancelled) {
          console.error("[Auth] Firebase (Firestore):", e?.message || e);
          sessionStorage.removeItem(SESSION_KEY);
          setUser(null);
          try {
            await firebaseSignOut(auth);
          } catch {
            /* ignore */
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const ok = validateAdmonHardcodedLogin(username, password);
    if (!ok) {
      const err = new Error("Usuario o contraseña incorrectos.");
      err.code = "AUTH_INVALID";
      throw err;
    }
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        username: ok.username,
        savedAt: new Date().toISOString(),
      }),
    );
    setUser({
      uid: ok.username,
      displayName: ok.username,
    });
    await ensureFirebaseForPanel();
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  /** Panel listo: sesión local + Firebase Auth (evita leer Firestore antes de tiempo). */
  const sessionReady = !loading && !!user && !!firebaseUser;

  const value = {
    user,
    loading,
    firebaseUser,
    sessionReady,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
