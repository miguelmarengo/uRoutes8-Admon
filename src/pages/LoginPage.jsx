import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const loginSchema = z.object({
  email: z.string().min(1, "El correo es obligatorio").email("Correo no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [firebaseError, setFirebaseError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const from = location.state?.from?.pathname ?? "/";

  const onSubmit = async (data) => {
    setFirebaseError(null);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err.code === "auth/invalid-credential"
          ? "Correo o contraseña incorrectos."
          : err.code === "auth/too-many-requests"
            ? "Demasiados intentos. Intenta más tarde."
            : err.message || "Error al iniciar sesión.";
      setFirebaseError(message);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-surface-100 border border-border rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              uRoutes Admin
            </h1>
            <p className="text-muted text-sm mt-1">
              Panel de administración
            </p>
          </div>

          {firebaseError && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{firebaseError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Correo
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ej. admin@uroutes.local"
                className="w-full px-4 py-2.5 rounded-lg bg-surface-50 border border-border-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-surface-50 border border-border-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-muted text-xs mt-6">
          Credenciales en Firebase Auth (proyecto uRoutes8).
        </p>
      </div>
    </div>
  );
};
