"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDocument, getDocumentExtractedInfo } from "@/lib/api";
import type { Document, DocumentExtractedInfo } from "@/types";

export default function DocumentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<DocumentExtractedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const documentId = params.id as string;

  const normalizeStatus = (status: string) => status.toLowerCase();

  useEffect(() => {
    let intervalId: number | null = null;

    const fetchDocumentData = async () => {
      try {
        const [documentData, extractedData] = await Promise.all([
          getDocument(documentId),
          getDocumentExtractedInfo(documentId).catch(() => null),
        ]);

        setDoc(documentData);
        setExtractedInfo(extractedData);

        const status = normalizeStatus(documentData.status);
        if ((status === "completed" || status === "failed") && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }

        return status;
      } catch {
        setError("Error al cargar el documento");
      } finally {
        setLoading(false);
      }

      return "failed";
    };

    void fetchDocumentData().then((status) => {
      if (status === "pending" || status === "processing") {
        intervalId = window.setInterval(() => {
          void fetchDocumentData();
        }, 3000);
      }
    });

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8">
        <div className="glass-panel ambient-shadow flex items-center gap-3 rounded-xl px-6 py-5">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          <p className="type-body text-on-surface-variant">Cargando estado del documento...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-error">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="type-h3 mb-2 text-primary">Error</h2>
        <p className="type-body mb-6 text-on-surface-variant">{error || "Documento no encontrado"}</p>
        <button 
          onClick={() => router.push("/documents")}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-on-primary hover:opacity-90"
        >
          Volver a documentos
        </button>
      </div>
    );
  }

  const normalizedStatus = normalizeStatus(doc.status);
  const isPending = normalizedStatus === "pending";
  const isProcessing = normalizedStatus === "processing";
  const isCompleted = normalizedStatus === "completed";
  const isError = normalizedStatus === "failed";

  const progressPercent = isCompleted ? 100 : isProcessing ? 68 : isPending ? 12 : 0;
  const statusLabel = isCompleted
    ? "Completado"
    : isProcessing
      ? "Procesando"
      : isPending
        ? "Pendiente"
        : "Error";

    const extractedSignals = extractedInfo?.signals ?? {
      emails: [],
      dates: [],
      amounts: [],
      references: [],
    };

    const extractedStats = extractedInfo?.stats ?? {
      characters: 0,
      words: 0,
      lines: 0,
    };

    const extractionCards = [
      {
        label: "Caracteres",
        value: extractedStats.characters.toLocaleString(),
      },
      {
        label: "Palabras",
        value: extractedStats.words.toLocaleString(),
      },
      {
        label: "Lineas",
        value: extractedStats.lines.toLocaleString(),
      },
      {
        label: "Fragmentos",
        value: (extractedInfo?.totalChunks ?? doc.chunksCount ?? 0).toLocaleString(),
      },
    ];

  return (
      <div className="min-h-[calc(100vh-68px)] bg-surface text-on-surface">
        <header className="border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-4 md:px-6 xl:px-8">
          <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-start justify-between gap-4">
            <div>
              <p className="pill-label mb-2">Detalle de documento</p>
              <h1 className="type-h2 text-primary">{doc.originalName}</h1>
              <p className="type-caption mt-1 text-on-surface-variant">ID: {doc.id}</p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                  isCompleted
                    ? "bg-success/15 text-success"
                    : isError
                      ? "bg-error-container text-error"
                      : "bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim"
                }`}
              >
                {statusLabel}
              </span>
              <button
                onClick={() => router.push("/documents")}
                className="inline-flex items-center gap-1 px-1 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Volver
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-[1360px] gap-6 px-4 py-8 md:px-6 xl:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-4">
            <article className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
              <p className="pill-label mb-2">Estado de procesamiento</p>
              <h2 className="type-h3 text-primary">
                {isCompleted ? "Extraccion finalizada" : "Extraccion en curso"}
              </h2>
              <p className="type-caption mt-2 text-on-surface-variant">
                {isCompleted
                  ? "El documento ya se encuentra procesado para revision de informacion extraida."
                  : "Aun estamos analizando y estructurando el contenido del archivo."}
              </p>

              <div className="mt-5">
                <div className="mb-2 flex items-end justify-between">
                  <span className="type-caption text-on-surface-variant">Progreso</span>
                  <span className="type-title-sm text-primary">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? "bg-success" : "bg-tertiary-fixed-dim"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-primary">upload_file</span>
                  <p className="type-caption text-on-surface-variant">
                    Archivo cargado correctamente.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-primary">data_object</span>
                  <p className="type-caption text-on-surface-variant">
                    Extraccion y fragmentacion en proceso.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-primary">verified</span>
                  <p className="type-caption text-on-surface-variant">
                    Validacion de informacion extraida.
                  </p>
                </div>
              </div>

              {doc.errorMessage && (
                <div className="mt-5 rounded-lg border border-error/25 bg-error-container/50 px-3 py-2 text-sm text-on-error-container">
                  {doc.errorMessage}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
              <p className="pill-label mb-2">Metadatos</p>
              <div className="space-y-2 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between gap-3">
                  <span>Tipo MIME</span>
                  <span className="font-medium text-primary">{doc.mimeType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Tamano</span>
                  <span className="font-medium text-primary">{((doc.size || 0) / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Creado</span>
                  <span className="font-medium text-primary">{new Date(doc.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Actualizado</span>
                  <span className="font-medium text-primary">{new Date(doc.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="pill-label mb-2">Informacion extraida</p>
                <h2 className="type-h3 text-primary">Vista estructurada del contenido</h2>
              </div>
            </div>

            {!isCompleted ? (
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5 text-sm text-on-surface-variant">
                Esta seccion se habilita cuando el documento termina su procesamiento.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {extractionCards.map((card) => (
                    <article key={card.label} className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                      <p className="pill-label">{card.label}</p>
                      <p className="type-h3 mt-1 text-primary">{card.value}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Correos", values: extractedSignals.emails },
                    { label: "Fechas", values: extractedSignals.dates },
                    { label: "Montos", values: extractedSignals.amounts },
                    { label: "Referencias", values: extractedSignals.references },
                  ].map((group) => (
                    <article key={group.label} className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                      <p className="pill-label mb-2">{group.label}</p>
                      {group.values.length === 0 ? (
                        <p className="type-caption text-on-surface-variant">Sin detecciones</p>
                      ) : (
                        <ul className="space-y-1">
                          {group.values.slice(0, 5).map((value) => (
                            <li key={value} className="type-caption text-primary">
                              {value}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>

                <div className="mt-5">
                  <p className="pill-label mb-2">Fragmentos extraidos</p>
                  {extractedInfo?.previewChunks?.length ? (
                    <div className="space-y-2">
                      {extractedInfo.previewChunks.map((chunk) => (
                        <details
                          key={`${chunk.chunkIndex}-${chunk.content.slice(0, 12)}`}
                          className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3"
                        >
                          <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
                            Fragmento {chunk.chunkIndex + 1}
                          </summary>
                          <p className="type-caption mt-2 whitespace-pre-wrap text-on-surface-variant">
                            {chunk.content}
                          </p>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                      No hay fragmentos disponibles para este documento.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
    </div>
  );
}
