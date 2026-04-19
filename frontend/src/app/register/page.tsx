"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, startDemoSession } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      setAuthenticated(email);
      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="canvas-gradient flex min-h-screen">
      <section className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#001225] via-primary to-primary-container px-12 py-16 text-on-primary lg:flex xl:px-20">
        <div className="absolute -top-28 left-16 h-[430px] w-[430px] rounded-full bg-tertiary-fixed-dim/14 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-primary-fixed/16 blur-[120px]" />
        <div className="grid-overlay absolute inset-0 opacity-20" />

        <div className="relative z-10 my-auto max-w-xl">
          <div className="meta-kicker meta-kicker-inverse mb-10">
            <span className="material-symbols-outlined meta-kicker-icon fill">rocket_launch</span>
            <span className="meta-kicker-text">Inicio guiado para equipos</span>
          </div>

          <h1 className="type-display">
            Construye tu
            <span className="block text-primary-fixed-dim">base documental inteligente.</span>
          </h1>

          <div className="mt-8 space-y-4 text-primary-fixed">
            {[
              "Pipeline de ingesta listo para PDF, DOCX, TXT y hojas de calculo.",
              "Indexacion semantica para consultas RAG con trazabilidad.",
              "Monitoreo de estados de extraccion y calidad en tiempo real.",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 text-tertiary-fixed-dim">check_circle</span>
                <p className="type-body text-primary-fixed">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-1/2 lg:px-14">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed/40 blur-[95px]" />
        </div>

        <div className="glass-panel ambient-shadow w-full max-w-[500px] rounded-2xl p-8 sm:p-10">
          <div className="mb-8">
            <p className="pill-label mb-2">Registro</p>
            <h2 className="type-h2 text-primary">Crear cuenta</h2>
            <p className="type-body mt-2 text-on-surface-variant">Activa tu workspace para empezar a extraer inteligencia documental.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/20 bg-error-container/50 p-3 text-sm text-on-error-container">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-email" className="pill-label mb-2 block font-semibold">
                Correo electronico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                <input
                  id="register-email"
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
              <label htmlFor="register-password" className="pill-label mb-2 block font-semibold">
                Contrasena
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  required
                  className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/55 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm" className="pill-label mb-2 block font-semibold">
                Confirmar contrasena
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">verified_user</span>
                <input
                  id="register-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contrasena"
                  required
                  className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/55 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container py-3.5 text-sm font-semibold text-on-primary shadow-[0_12px_30px_rgba(0,25,60,0.18)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
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
              Continuar sin BD (modo demo)
            </button>

            <p className="type-caption text-center text-on-surface-variant">
              Modo demo usa almacenamiento local y no depende de base de datos.
            </p>
          </form>

          <p className="type-body mt-8 text-center text-on-surface-variant">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Iniciar sesion
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
