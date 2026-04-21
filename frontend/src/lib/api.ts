import type {
  AuthResponse,
  Document,
  DocumentExtractedInfo,
  QueryResponse,
  UploadResponse,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_SESSION_KEY = "rag_demo_mode";
const DEMO_DOCS_KEY = "rag_demo_documents";

type DemoDocument = Document;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isDemoToken(token: string | null): boolean {
  return Boolean(token && token.startsWith("demo."));
}

function createDemoToken(email: string): string {
  const payload = {
    sub: "demo-user",
    email,
    mode: "demo",
    iat: Math.floor(Date.now() / 1000),
  };

  return `demo.${btoa(JSON.stringify(payload))}.signature`;
}

function getDemoDocumentsStore(): DemoDocument[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(DEMO_DOCS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as DemoDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setDemoDocumentsStore(docs: DemoDocument[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(DEMO_DOCS_KEY, JSON.stringify(docs));
}

function generateDemoDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hydrateDemoDocumentStatus(doc: DemoDocument): DemoDocument {
  if (doc.status === "completed" || doc.status === "failed") {
    return doc;
  }

  const now = Date.now();
  const createdAt = new Date(doc.createdAt).getTime();
  const elapsed = now - createdAt;

  if (elapsed >= 8000) {
    return {
      ...doc,
      status: "completed",
      updatedAt: new Date(now).toISOString(),
      chunksCount: doc.chunksCount ?? Math.max(4, Math.ceil(doc.size / 8000)),
    };
  }

  if (elapsed >= 2000) {
    return {
      ...doc,
      status: "processing",
      updatedAt: new Date(now).toISOString(),
    };
  }

  return {
    ...doc,
    status: "pending",
    updatedAt: new Date(now).toISOString(),
  };
}

function normalizeDocumentStatus(status: unknown): Document["status"] {
  const value = String(status ?? "").toLowerCase();

  if (value === "completed") return "completed";
  if (value === "processing") return "processing";
  if (value === "failed") return "failed";
  return "pending";
}

function normalizeDocument(raw: Document | Record<string, unknown>): Document {
  const source = raw as unknown as Record<string, unknown>;
  const rawChunks = source.chunksCount ?? source.totalChunks;
  const parsedChunks = Number(rawChunks);
  const fallbackTimestamp = new Date().toISOString();

  const id = typeof source.id === "string" ? source.id : "";
  const originalName =
    typeof source.originalName === "string"
      ? source.originalName
      : typeof source.original_name === "string"
      ? source.original_name
      : "Documento sin nombre";
  const mimeType =
    typeof source.mimeType === "string"
      ? source.mimeType
      : typeof source.mime_type === "string"
      ? source.mime_type
      : "application/octet-stream";
  const size = Number(source.size);
  const createdAt =
    typeof source.createdAt === "string"
      ? source.createdAt
      : typeof source.created_at === "string"
      ? source.created_at
      : fallbackTimestamp;
  const updatedAt =
    typeof source.updatedAt === "string"
      ? source.updatedAt
      : typeof source.updated_at === "string"
      ? source.updated_at
      : createdAt;

  return {
    id,
    originalName,
    mimeType,
    size: Number.isFinite(size) ? size : 0,
    createdAt,
    updatedAt,
    status: normalizeDocumentStatus(source.status),
    chunksCount: Number.isFinite(parsedChunks) ? parsedChunks : undefined,
    totalChunks: Number.isFinite(parsedChunks) ? parsedChunks : undefined,
    errorMessage:
      source.errorMessage === null || typeof source.errorMessage === "string"
        ? (source.errorMessage as string | null)
        : undefined,
  };
}

function buildDemoExtractedInfo(doc: Document): DocumentExtractedInfo {
  const simulatedText = [
    `Documento: ${doc.originalName}`,
    "Extraccion inicial completada en modo demo.",
    "Se detectaron fragmentos utiles para clasificacion y validacion.",
  ].join("\n");

  const words = simulatedText.split(/\s+/).filter(Boolean).length;
  const lines = simulatedText.split(/\n+/).filter(Boolean).length;
  const totalChunks = doc.chunksCount ?? Math.max(3, Math.ceil((doc.size || 1) / 10000));
  const isCompleted = doc.status === "completed";

  return {
    documentId: doc.id,
    status: doc.status,
    totalChunks,
    stats: {
      characters: simulatedText.length,
      words,
      lines,
    },
    signals: {
      emails: ["operaciones@empresa.demo"],
      dates: [new Date(doc.createdAt).toISOString().slice(0, 10)],
      amounts: ["$ 1,250.00"],
      references: [doc.originalName],
    },
    previewChunks: isCompleted
      ? [
          {
            chunkIndex: 0,
            content:
              "Resumen del documento: contenido extraido y normalizado para su validacion operativa.",
          },
          {
            chunkIndex: 1,
            content:
              "Campos detectados (demo): entidad emisora, fecha documental, montos y referencias clave.",
          },
        ]
      : [],
  };
}

function syncDemoDocumentsStatus(): DemoDocument[] {
  const docs = getDemoDocumentsStore();
  const hydrated = docs.map((doc) => hydrateDemoDocumentStatus(doc));
  setDemoDocumentsStore(hydrated);
  return hydrated;
}

export function isDemoModeActive(): boolean {
  if (!isBrowser()) return DEMO_MODE_ENABLED;

  if (DEMO_MODE_ENABLED) return true;

  return localStorage.getItem(DEMO_SESSION_KEY) === "1" || isDemoToken(getToken());
}

export function startDemoSession(email = "demo@rag.local"): AuthResponse {
  const token = createDemoToken(email);
  setToken(token);

  if (isBrowser()) {
    localStorage.setItem(DEMO_SESSION_KEY, "1");
  }

  return { access_token: token };
}

/* ─── Token helpers ────────────────────────────────── */
export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem("rag_token");
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem("rag_token", token);
}

export function removeToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem("rag_token");
  localStorage.removeItem(DEMO_SESSION_KEY);
}

/* ─── Base fetch wrapper ───────────────────────────── */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}/${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error desconocido" }));
    throw new Error(error.message || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/* ─── Auth ─────────────────────────────────────────── */
export async function login(email: string, password: string): Promise<AuthResponse> {
  if (isDemoModeActive()) {
    return startDemoSession(email || "demo@rag.local");
  }

  const data = await apiFetch<AuthResponse>("auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  if (isDemoModeActive()) {
    return startDemoSession(email || "demo@rag.local");
  }

  const data = await apiFetch<AuthResponse>("auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export function logout(): void {
  removeToken();
  if (isBrowser()) {
    window.location.href = "/login";
  }
}

/* ─── Documents ────────────────────────────────────── */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  if (isDemoModeActive()) {
    const now = new Date().toISOString();
    const demoDoc: DemoDocument = {
      id: generateDemoDocumentId(),
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      chunksCount: 0,
    };

    const docs = syncDemoDocumentsStatus();
    setDemoDocumentsStore([demoDoc, ...docs]);

    return {
      id: demoDoc.id,
      originalName: demoDoc.originalName,
      status: demoDoc.status,
      message: "Documento cargado en modo demo local",
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<UploadResponse>("documents/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getDocuments(): Promise<Document[]> {
  if (isDemoModeActive()) {
    return syncDemoDocumentsStatus().map((doc) => normalizeDocument(doc));
  }

  const data = await apiFetch<Document[]>("documents");
  return data.map((doc) => normalizeDocument(doc));
}

export async function getDocument(id: string): Promise<Document> {
  if (isDemoModeActive()) {
    const docs = syncDemoDocumentsStatus();
    const found = docs.find((doc) => doc.id === id);

    if (!found) {
      throw new Error("Documento no encontrado en modo demo");
    }

    return normalizeDocument(found);
  }

  const data = await apiFetch<Document>(`documents/${id}`);
  return normalizeDocument(data);
}

export async function getDocumentExtractedInfo(
  id: string,
): Promise<DocumentExtractedInfo> {
  if (isDemoModeActive()) {
    const doc = await getDocument(id);
    return buildDemoExtractedInfo(doc);
  }

  const data = await apiFetch<DocumentExtractedInfo>(
    `documents/${id}/extracted-info`,
  );

  return {
    ...data,
    status: String(data.status ?? "pending").toLowerCase(),
    totalChunks: Number(data.totalChunks || 0),
    stats: {
      characters: Number(data.stats?.characters || 0),
      words: Number(data.stats?.words || 0),
      lines: Number(data.stats?.lines || 0),
    },
    signals: {
      emails: data.signals?.emails ?? [],
      dates: data.signals?.dates ?? [],
      amounts: data.signals?.amounts ?? [],
      references: data.signals?.references ?? [],
    },
    previewChunks: Array.isArray(data.previewChunks) ? data.previewChunks : [],
  };
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
  if (isDemoModeActive()) {
    const docs = syncDemoDocumentsStatus().filter((doc) => doc.id !== id);
    setDemoDocumentsStore(docs);
    return { message: "Documento eliminado en modo demo" };
  }

  return apiFetch<{ message: string }>(`documents/${id}`, {
    method: "DELETE",
  });
}

/* ─── RAG ──────────────────────────────────────────── */
export async function queryRAG(
  question: string,
  options: { documentIds?: string[]; systemHint?: string } = {},
): Promise<QueryResponse> {
  if (isDemoModeActive()) {
    const docs = syncDemoDocumentsStatus();
    const completedDocs = docs.filter((doc) => doc.status === "completed");
    const scopedDocs =
      Array.isArray(options.documentIds) && options.documentIds.length > 0
        ? completedDocs.filter((doc) => options.documentIds?.includes(doc.id))
        : completedDocs;
    const sourceDoc = scopedDocs[0];

    if (!sourceDoc) {
      return {
        answer:
          "Modo demo activo: aun no hay documentos completados. Sube un archivo para simular una respuesta con fuentes.",
        sources: [],
        processingTime: 240,
      };
    }

    return {
      answer:
        `Modo demo activo: tu pregunta fue "${question}". ` +
        "Esta respuesta es simulada para permitir pruebas sin base de datos ni backend activo.",
      sources: [
        {
          documentId: sourceDoc.id,
          documentName: sourceDoc.originalName,
          chunkContent:
            "Fragmento simulado del documento en modo demo. Activa backend + BD para respuestas reales del motor RAG.",
          chunkIndex: 1,
          similarity: 0.93,
        },
      ],
      processingTime: 420,
    };
  }

  return apiFetch<QueryResponse>("rag/query", {
    method: "POST",
    body: JSON.stringify({
      question,
      ...(Array.isArray(options.documentIds) && options.documentIds.length > 0
        ? { documentIds: options.documentIds }
        : {}),
      ...(options.systemHint ? { systemHint: options.systemHint } : {}),
    }),
  });
}
