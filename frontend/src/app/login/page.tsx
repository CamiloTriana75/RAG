"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, startDemoSession } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { setAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDemoAccess = () => {
    const demoEmail = email.trim() || "demo@rag.local";
    startDemoSession(demoEmail);
    setAuthenticated(demoEmail);
    router.push("/documents");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      setAuthenticated(email);
      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="canvas-gradient flex min-h-screen">
      <section className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary via-primary-container to-[#001225] p-12 text-on-primary lg:flex xl:p-20">
        <div className="absolute -left-16 top-16 h-80 w-80 rounded-full bg-tertiary-fixed-dim/18 blur-[110px]" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-primary-fixed/22 blur-[130px]" />
        <div className="grid-overlay absolute inset-0 opacity-20" />

        <div className="relative z-10 mt-auto max-w-xl">
          <div className="meta-kicker meta-kicker-inverse mb-10">
            <span className="material-symbols-outlined meta-kicker-icon fill">architecture</span>
            <span className="meta-kicker-text">Plataforma Cognitive Architect</span>
          </div>

          <h1 className="type-display">
            La inteligencia
            <span className="block text-primary-fixed-dim">detras de cada documento.</span>
          </h1>
          <p className="type-body mt-6 max-w-md text-primary-fixed">
            Analisis documental de alta precision impulsado por modelos de IA,
            extraccion contextual y validacion trazable de entidades.
          </p>
        </div>
      </section>

      <section className="relative flex w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-1/2 lg:px-14">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed/35 blur-[95px]" />
        </div>

        <div className="glass-panel ambient-shadow w-full max-w-[480px] rounded-2xl p-8 sm:p-10">
          <div className="mb-9">
            <p className="pill-label mb-2">Acceso seguro</p>
            <h2 className="type-h2 text-primary">Iniciar sesion</h2>
            <p className="type-body mt-2 text-on-surface-variant">Ingresa tus credenciales para continuar en tu workspace.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/20 bg-error-container/50 p-3 text-sm text-on-error-container">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="pill-label mb-2 block font-semibold">
                Correo electronico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/55 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="login-password" className="pill-label block font-semibold">
                  Contrasena
                </label>
                <Link href="#" className="type-caption font-medium text-secondary hover:text-tertiary-fixed-dim">
                  Recuperar acceso
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/55 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container py-3.5 text-sm font-semibold text-on-primary shadow-[0_12px_30px_rgba(0,25,60,0.18)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Ingresando...
                </>
              ) : (
                <>
                  Acceder al sistema
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDemoAccess}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
              Entrar sin BD (modo demo)
            </button>

            <p className="type-caption text-center text-on-surface-variant">
              Modo demo usa datos locales en este navegador. No requiere backend.
            </p>
          </form>

          <p className="type-body mt-8 text-center text-on-surface-variant">
            No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>

          <div className="mt-7 flex items-center justify-center">
            <Link href="/" className="type-caption inline-flex items-center gap-1 text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
