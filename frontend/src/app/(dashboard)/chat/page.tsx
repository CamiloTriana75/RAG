"use client";

import Link from "next/link";

export default function ChatPage() {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-8 pt-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-14 h-56 w-56 rounded-full bg-tertiary-fixed-dim/14 blur-[95px]" />
        <div className="absolute right-[8%] top-24 h-48 w-48 rounded-full bg-primary-fixed/24 blur-[100px]" />
      </div>

      <header className="ambient-shadow relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-fixed/24 blur-2xl" />

        <div className="relative">
          <div className="meta-kicker mb-3">
            <span className="meta-kicker-text">Fase 2 del producto</span>
          </div>
          <h1 className="type-h1 text-primary">Consultas conversacionales proximamente</h1>
          <p className="type-body mt-3 max-w-3xl text-on-surface-variant">
            El flujo actual prioriza la extraccion documental y validacion de datos.
            El modulo de preguntas sobre documentos se habilitara en una siguiente iteracion.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-12">
        <article className="ambient-shadow rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 lg:col-span-8">
          <p className="pill-label mb-2">Flujo recomendado</p>
          <h2 className="type-h2 text-primary">Primero extrae, luego consulta</h2>
          <div className="mt-5 space-y-3">
            {[
              {
                title: "1. Carga tus documentos",
                detail: "Sube archivos al repositorio para iniciar OCR, parsing y normalizacion.",
              },
              {
                title: "2. Verifica estado y calidad",
                detail: "Confirma que el procesamiento termine correctamente por documento.",
              },
              {
                title: "3. Habilitar consultas RAG",
                detail: "La capa de preguntas y respuestas se activa en la siguiente fase.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-outline-variant/18 bg-surface-container-low p-4"
              >
                <h3 className="type-title-sm text-primary">{step.title}</h3>
                <p className="type-caption mt-1 text-on-surface-variant">{step.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="ambient-shadow rounded-2xl border border-outline-variant/22 bg-primary p-6 text-on-primary lg:col-span-4">
          <p className="pill-label mb-2 text-primary-fixed">Estado del modulo</p>
          <h2 className="type-h2">En preparacion</h2>
          <p className="type-body mt-2 text-primary-fixed">
            Cuando se active, aqui tendras prompts guiados, respuestas con fuentes y score de similitud.
          </p>

          <Link
            href="/documents"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-fixed px-4 py-3 text-sm font-semibold text-primary"
          >
            <span className="material-symbols-outlined text-base">folder_open</span>
            Ir a extraccion documental
          </Link>
        </article>
      </section>
    </div>
  );
}
