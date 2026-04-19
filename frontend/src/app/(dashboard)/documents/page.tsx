"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDocuments, uploadDocument, deleteDocument } from "@/lib/api";
import type { Document } from "@/types";
import { useRouter } from "next/navigation";

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeStatus = (status: string) => status.toLowerCase();

  const fetchDocs = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch {
      setError("Error al cargar los documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void fetchDocs();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchDocs();
    }, 5000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await uploadDocument(file);
      await fetchDocs();
      router.push(`/documents/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Seguro que deseas eliminar este documento?")) return;
    try {
      await deleteDocument(id);
      await fetchDocs();
    } catch {
      setError("Error al eliminar el documento");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (normalizeStatus(status)) {
      case "completed":
        return (
          <span className="rounded-full border border-success/30 bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
            Completado
          </span>
        );
      case "pending":
      case "processing":
        return (
          <span className="rounded-full border border-tertiary-fixed-dim/35 bg-tertiary-fixed-dim/14 px-2.5 py-1 text-xs font-semibold text-tertiary-fixed-dim">
            En proceso
          </span>
        );
      case "failed":
        return (
          <span className="rounded-full border border-error/35 bg-error-container px-2.5 py-1 text-xs font-semibold text-error">
            Error
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-outline-variant/30 bg-surface-variant px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
            {status}
          </span>
        );
    }
  };

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [documents],
  );

  const processingDocuments = useMemo(
    () =>
      sortedDocuments.filter((doc) => {
        const status = normalizeStatus(doc.status);
        return status === "pending" || status === "processing";
      }),
    [sortedDocuments],
  );

  const completedDocuments = useMemo(
    () =>
      sortedDocuments.filter((doc) => normalizeStatus(doc.status) === "completed")
        .length,
    [sortedDocuments],
  );

  const filteredDocuments = useMemo(
    () =>
      sortedDocuments.filter((doc) => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return (
          doc.originalName.toLowerCase().includes(query) ||
          doc.mimeType.toLowerCase().includes(query)
        );
      }),
    [searchTerm, sortedDocuments],
  );

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const progressByStatus = (status: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "completed") return 100;
    if (normalized === "processing") return 62;
    if (normalized === "pending") return 20;
    return 0;
  };

  const getDocumentIconTone = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "bg-error-container text-error";
    if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return "bg-success/15 text-success";
    if (mimeType.includes("word")) return "bg-info/15 text-info";
    return "bg-primary-fixed text-primary";
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "picture_as_pdf";
    if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return "table_chart";
    if (mimeType.includes("word")) return "article";
    return "description";
  };

  const openDocument = (id: string) => {
    router.push(`/documents/${id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 pb-8 pt-6 md:px-6 md:pb-10 md:pt-7 xl:px-8">
      <header className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pill-label mb-2">Workspace documental</p>
            <h1 className="type-h2 text-primary">Extraccion de documentos</h1>
            <p className="type-body mt-2 max-w-2xl text-on-surface-variant">
              Gestiona la carga y el procesamiento de archivos para obtener informacion estructurada.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchDocs()}
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.04em] text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[13px]">refresh</span>
            Actualizar
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
            <p className="pill-label">Documentos</p>
            <p className="type-h3 mt-2 text-primary">{documents.length}</p>
          </article>
          <article className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
            <p className="pill-label">Completados</p>
            <p className="type-h3 mt-2 text-primary">{completedDocuments}</p>
          </article>
          <article className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
            <p className="pill-label">En proceso</p>
            <p className="type-h3 mt-2 text-primary">{processingDocuments.length}</p>
          </article>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-error/20 bg-error-container/50 p-4 text-on-error-container">
          <span className="material-symbols-outlined text-error">error</span>
          {error}
        </div>
      )}

      <section
        className={`rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 md:p-7 ${
          dragActive
            ? "border-primary"
            : ""
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.docx,.md,.txt,.csv,.xls,.xlsx"
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="pill-label mb-2">Carga de documentos</p>
            <h2 className="type-h3 text-primary">
              {uploading ? "Subiendo archivo..." : "Agregar documento al pipeline"}
            </h2>
            <p className="type-body mt-2 max-w-2xl text-on-surface-variant">
              Formatos soportados: PDF, DOCX, TXT, MD, CSV, XLS y XLSX.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Seleccionar archivo
          </button>
        </div>

        <div
          className={`mt-5 rounded-xl border border-dashed p-6 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary-fixed/18"
              : "border-outline-variant/30 bg-surface-container-low"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
          <p className="type-title-sm mt-2 text-primary">
            Arrastra un documento aqui
          </p>
          <p className="type-caption mt-1 text-on-surface-variant">
            O haz click para elegir un archivo desde tu equipo.
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full transition-all ${uploading ? "w-3/4 animate-pulse bg-tertiary-fixed-dim" : "w-0"}`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="type-h3 text-primary">Cola de extraccion en vivo</h2>
          <button
            onClick={() => void fetchDocs()}
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.04em] text-on-surface-variant transition-colors hover:text-primary"
          >
            Actualizar
            <span className="material-symbols-outlined text-[13px]">refresh</span>
          </button>
        </div>

        {processingDocuments.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
            No hay documentos en procesamiento activo en este momento.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {processingDocuments.slice(0, 3).map((doc) => (
              <article key={doc.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="pill-label">{doc.mimeType.split("/")[1] || "documento"}</span>
                  {getStatusBadge(doc.status)}
                </div>
                <p className="type-title-sm truncate text-primary">{doc.originalName}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Subido {new Date(doc.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full animate-pulse rounded-full bg-tertiary-fixed-dim"
                    style={{ width: `${progressByStatus(doc.status)}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 px-5 py-4">
          <h2 className="type-h3 text-primary">Repositorio documental ({documents.length})</h2>

          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-on-surface-variant">
              search
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o tipo..."
              className="w-full rounded-lg border border-outline-variant/22 bg-surface-container-low py-2 pl-10 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary/40 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center text-on-surface-variant">
            <span className="material-symbols-outlined mb-3 text-5xl opacity-40">inventory_2</span>
            <p>
              {searchTerm.trim()
                ? "No hay resultados para esa busqueda."
                : "Aun no tienes documentos cargados. Sube uno para comenzar."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/12 bg-surface-container-low text-left text-xs uppercase tracking-[0.08em] text-on-surface-variant">
                    <th className="px-5 py-3 font-semibold">Documento</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Tipo</th>
                    <th className="px-5 py-3 font-semibold">Tamano</th>
                    <th className="px-5 py-3 font-semibold">Fecha</th>
                    <th className="px-5 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-outline-variant/12 last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getDocumentIconTone(doc.mimeType)}`}>
                            <span className="material-symbols-outlined text-base">{getDocumentIcon(doc.mimeType)}</span>
                          </div>
                          <div>
                            <p className="type-title-sm text-primary">{doc.originalName}</p>
                            {doc.chunksCount !== undefined && (
                              <p className="type-caption text-on-surface-variant">
                                {doc.chunksCount} fragmentos
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(doc.status)}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{doc.mimeType}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{formatSize(doc.size)}</td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        {new Date(doc.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDocument(doc.id)}
                            className="rounded-md border border-outline-variant/25 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-surface-container-low"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="rounded-md border border-error/30 px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-container/40"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-outline-variant/12 md:hidden">
              {filteredDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="space-y-3 px-5 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getDocumentIconTone(doc.mimeType)}`}>
                      <span className="material-symbols-outlined text-base">{getDocumentIcon(doc.mimeType)}</span>
                    </div>
                    <div>
                      <p className="type-title-sm text-primary">{doc.originalName}</p>
                      <p className="type-caption mt-0.5 text-on-surface-variant">
                        {formatSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {getStatusBadge(doc.status)}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDocument(doc.id)}
                        className="rounded-md border border-outline-variant/25 px-2.5 py-1 text-xs font-semibold text-primary"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="rounded-md border border-error/30 px-2.5 py-1 text-xs font-semibold text-error"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
