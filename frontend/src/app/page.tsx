import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="canvas-gradient relative flex-grow overflow-hidden pb-16 pt-24">
        <section className="relative overflow-hidden pb-24 pt-14 lg:pt-20">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-secondary-container/30 blur-[120px]" />
          <div className="absolute -right-10 top-0 h-64 w-64 rounded-full bg-primary-fixed/60 blur-[110px]" />

          <div className="page-shell relative z-10 grid gap-14 lg:grid-cols-[1.08fr_1fr] lg:items-center">
            <div className="lg:-ml-4 xl:-ml-6">
              <div className="meta-kicker mb-7">
                <span className="meta-kicker-text">Motor cognitivo en vivo · v2.4</span>
              </div>

              <h1 className="type-display text-primary">
                Extraccion documental de precision,
                <span className="text-gradient-cyan block">disenada para decisiones criticas.</span>
              </h1>

              <p className="type-lead mt-6 max-w-xl text-on-surface-variant">
                Convierte PDFs, contratos, facturas y reportes en datos
                estructurados listos para operar. Cognitive Architect combina
                OCR, validacion y razonamiento RAG con trazabilidad de fuente.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-br from-primary to-primary-container px-7 py-4 text-sm font-semibold text-on-primary shadow-[0_14px_28px_rgba(0,25,60,0.2)] transition-all hover:-translate-y-0.5"
                >
                  Desplegar modelo de extraccion
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/25 bg-surface-container-lowest px-7 py-4 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-lg">play_circle</span>
                  Entrar al workspace
                </Link>
              </div>
            </div>

            <div className="relative h-[500px] w-full lg:h-[560px]">
              <article className="ambient-shadow absolute left-1/2 top-10 w-[86%] max-w-[560px] -translate-x-1/2 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/96 p-5 sm:top-9 sm:-translate-x-[51%] sm:-rotate-[0.8deg] sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed/70 text-primary">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <div>
                    <h3 className="type-title-sm text-primary">Reporte_Financiero_T3.pdf</h3>
                    <p className="type-caption text-on-surface-variant">Escaneando datos no estructurados...</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 border-t border-outline-variant/10 pt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full w-[74%] rounded-full bg-tertiary-fixed-dim" />
                  </div>
                  <div className="h-2 w-3/4 rounded-full bg-surface-container-high" />
                  <div className="h-2 w-2/3 rounded-full bg-surface-container-high" />
                </div>
              </article>

              <div className="absolute bottom-14 left-1/2 w-[86%] max-w-[560px] -translate-x-1/2 sm:bottom-10 sm:-translate-x-[49%]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
                  <article className="ambient-shadow w-full rounded-xl border border-outline-variant/12 bg-surface-container-lowest/95 p-4 sm:w-[238px] sm:-translate-y-1 sm:-rotate-[1.6deg]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Validacion</p>
                    <p className="type-title-sm mt-1 text-primary">Consistencia documental</p>
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-base text-tertiary-fixed-dim">task_alt</span>
                      <p className="type-caption text-on-surface-variant">Campos criticos verificados</p>
                    </div>
                  </article>

                  <article className="ambient-shadow w-full rounded-xl border border-outline-variant/12 bg-surface-container-lowest/96 p-4 sm:w-[226px] sm:translate-y-4 sm:rotate-[2deg]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-tertiary-fixed-dim text-[10px] font-bold text-tertiary-fixed-dim">
                        98%
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Entidad extraida</p>
                        <p className="type-title-sm text-primary">Ingresos Totales (T3)</p>
                        <p className="type-caption text-secondary">$4.2M USD</p>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="soluciones" className="page-shell py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="meta-kicker mb-3">
                <span className="meta-kicker-text">Soluciones</span>
              </div>
              <h2 className="type-h2 text-primary">
                Diseñado para operaciones documentales complejas
              </h2>
            </div>
            <p className="type-body max-w-md text-on-surface-variant">
              Desde compliance financiero hasta contratos legales multiformato,
              cada flujo queda trazable, auditable y listo para consulta.
            </p>
          </div>

          <div className="grid gap-4 lg:auto-rows-fr lg:grid-cols-12">
            {[
              {
                icon: "account_balance",
                title: "Finanzas y auditoria",
                text: "Extrae KPIs, consolidaciones y tablas desde reportes trimestrales con referencia exacta de origen.",
              },
              {
                icon: "gavel",
                title: "Legal y procurement",
                text: "Identifica clausulas, riesgos y vencimientos con resaltado de entidades y sugerencias de revision.",
              },
              {
                icon: "inventory_2",
                title: "Operaciones y backoffice",
                text: "Convierte facturas, ordenes y formularios en datos listos para ERP y procesos automatizados.",
              },
            ].map((item, idx) => (
              <article
                key={item.title}
                className={`ambient-shadow relative overflow-hidden rounded-2xl border border-outline-variant/20 ${
                  idx === 0
                    ? "lg:col-span-5 lg:row-span-2 bg-surface-container-lowest p-7"
                    : "lg:col-span-7 bg-surface-container-lowest p-6"
                }`}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-tertiary-fixed-dim/12 blur-2xl" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <h3 className="type-h3 text-primary">{item.title}</h3>
                  <p className={`mt-2 text-on-surface-variant ${idx === 0 ? "type-body" : "type-caption"}`}>
                    {item.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="seguridad" className="page-shell pb-16">
          <div className="ambient-shadow relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest">
            <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-primary-fixed/28 blur-3xl" />
            <div className="pointer-events-none absolute -right-14 bottom-4 h-40 w-40 rounded-full bg-tertiary-fixed-dim/16 blur-3xl" />

            <div className="relative grid gap-4 p-6 lg:grid-cols-[1.12fr_0.88fr] lg:p-8">
              <article className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/85 p-6">
                <p className="pill-label mb-2">Seguridad</p>
                <h3 className="type-h3 text-primary">Control granular de acceso</h3>
                <p className="type-body mt-2 text-on-surface-variant">
                  Autenticacion por token, separacion de datos por workspace y
                  observabilidad de eventos para auditorias internas.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "JWT por sesion",
                    "Permisos por workspace",
                    "Registro de actividad",
                    "Eventos auditables",
                  ].map((point) => (
                    <div
                      key={point}
                      className="rounded-lg border border-outline-variant/18 bg-surface-container-low px-3 py-2"
                    >
                      <p className="type-caption text-primary">{point}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-outline-variant/24 bg-primary p-6 text-on-primary">
                <p className="pill-label mb-2 text-primary-fixed">Gobernanza</p>
                <h3 className="type-h3">Trazabilidad completa</h3>
                <p className="type-body mt-2 text-primary-fixed">
                  Cada respuesta del chat referencia chunks originales para que
                  tus equipos validen el dato en segundos.
                </p>

                <div className="mt-5 space-y-2.5">
                  {[
                    "Fuente citada por respuesta",
                    "Historial consultable por equipo",
                    "Validacion rapida en auditoria",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary-fixed">check_circle</span>
                      <p className="type-caption text-primary-fixed">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="page-shell pb-16">
          <div className="ambient-shadow relative overflow-hidden rounded-3xl border border-outline-variant/22 bg-surface-container-lowest p-8 text-center">
            <div className="relative">
              <h3 className="type-h2 text-primary">
                Convierte documentos en ventaja competitiva
              </h3>
              <p className="type-body mx-auto mt-3 max-w-2xl text-on-surface-variant">
                Activa tu workspace y empieza a consultar conocimiento con una
                capa de IA pensada para entornos empresariales exigentes.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
                >
                  Empezar ahora
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-outline-variant/30 bg-surface-container-low px-6 py-3 text-sm font-semibold text-primary"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
