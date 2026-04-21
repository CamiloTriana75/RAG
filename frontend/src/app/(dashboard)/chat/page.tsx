"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDocuments, queryRAG } from "@/lib/api";
import type { ChatMessage, Document } from "@/types";

const CHAT_SESSIONS_STORAGE_KEY = "rag_chat_sessions_v1";
const ACTIVE_CHAT_STORAGE_KEY = "rag_active_chat_id_v1";
const MAX_QUESTION_LENGTH = 1800;

type AnalysisModeId =
  | "custom"
  | "summary"
  | "extract"
  | "validate"
  | "compare"
  | "compliance";

interface AnalysisMode {
  id: AnalysisModeId;
  label: string;
  icon: string;
  helper: string;
  template: string;
}

const ANALYSIS_MODES: AnalysisMode[] = [
  {
    id: "custom",
    label: "Libre",
    icon: "edit_note",
    helper: "Escribes tu solicitud desde cero.",
    template: "",
  },
  {
    id: "summary",
    label: "Resumen ejecutivo",
    icon: "summarize",
    helper: "Puntos clave, riesgos y acciones.",
    template:
      "Elabora un resumen ejecutivo en 6 viñetas: objetivo del documento, hallazgos clave, riesgos y acciones recomendadas. Cierra con una conclusión de máximo 3 líneas.",
  },
  {
    id: "extract",
    label: "Extracción de campos",
    icon: "table_chart",
    helper: "Devuelve todos los campos del documento en tabla.",
    template:
      "TAREA: Extrae TODOS los campos que encuentres en el documento sin omitir ninguno. \n\n" +
      "Reglas obligatorias:\n" +
      "1. Produce una tabla markdown con exactamente 3 columnas: | Campo | Valor | Observación |\n" +
      "2. Una fila por cada campo encontrado (fecha, nombre, cédula/NIT, dirección, teléfono, monto, referencia, estado, etc.)\n" +
      "3. Si el valor no está presente en el documento escribe: N/A\n" +
      "4. En Observación indica el tipo de dato, su calidad y si requiere corrección\n" +
      "5. NO escribas nada fuera de la tabla (ni introducción ni conclusión)\n" +
      "6. La pregunta del usuario puede agregar criterios adicionales de extracción.",
  },
  {
    id: "validate",
    label: "Validación",
    icon: "fact_check",
    helper: "Detecta inconsistencias y anomalías.",
    template:
      "TAREA: Valida la integridad y consistencia de los datos. NO uses markdown. NO uses negritas.\n\n" +
      "Formato obligatorio de respuesta (texto plano, sin asteriscos):\n\n" +
      "RESULTADO DE VALIDACION\n" +
      "======================\n" +
      "Estado general: [OK / ADVERTENCIA / CRITICO]\n" +
      "Total de hallazgos: [N]\n\n" +
      "HALLAZGOS DETALLADOS\n" +
      "--------------------\n" +
      "[Para cada hallazgo usa este bloque:]\n" +
      "N. [Titulo del hallazgo]\n" +
      "   Severidad : ALTA | MEDIA | BAJA\n" +
      "   Campo     : [nombre del campo afectado]\n" +
      "   Evidencia : [texto exacto del documento]\n" +
      "   Accion    : [que debe hacerse]\n\n" +
      "RESUMEN EJECUTIVO\n" +
      "-----------------\n" +
      "[2-3 lineas con el diagnostico global y mayor riesgo identificado]",
  },
  {
    id: "compare",
    label: "Comparación",
    icon: "compare_arrows",
    helper: "Contrasta dos secciones o documentos.",
    template:
      "Compara las secciones más relevantes y devuelve diferencias en una tabla con: tema, documento A, documento B, impacto y recomendación.",
  },
  {
    id: "compliance",
    label: "Checklist",
    icon: "checklist",
    helper: "Cumplimiento por criterio.",
    template:
      "TAREA: Construye un checklist de cumplimiento documental exhaustivo paso a paso. \n\n" +
      "Reglas obligatorias:\n" +
      "1. Debes generar estrictamente una tabla en formato Markdown con las siguientes columnas exactas:\n" +
      "   | 📝 ID | 🔍 Criterio de Evaluación | 📊 Estado | 📎 Evidencia Encontrada | 🛠️ Acción Requerida |\n" +
      "2. En la columna 'Estado' usa únicamente estos valores (con emojis para facilidad visual):\n" +
      "   - ✅ CUMPLE\n" +
      "   - ❌ NO CUMPLE\n" +
      "   - ⚠️ PARCIAL\n" +
      "3. Evalúa como mínimo: Identificación de partes, vigencia de fechas, existencia de montos lógicos, firmas, referencias legales y consistencia general.\n" +
      "4. Sé directo, breve y no incluyas textos de introducción ni de cierre.",
  },
];

const QUICK_PROMPTS: Array<{ label: string; icon: string; prompt: string }> = [
  {
    label: "5 bullets ejecutivos",
    icon: "format_list_bulleted",
    prompt:
      "Resume este contenido en 5 bullets con enfoque ejecutivo y menciona riesgos principales.",
  },
  {
    label: "Tabla de registros",
    icon: "table_rows",
    prompt:
      "Devuelve una tabla con cada registro relevante y columnas normalizadas para análisis.",
  },
  {
    label: "Riesgos críticos",
    icon: "warning",
    prompt:
      "Enumera los 5 riesgos más críticos, su evidencia textual y la acción inmediata recomendada.",
  },
  {
    label: "Calidad de datos",
    icon: "verified",
    prompt:
      "Evalúa calidad de datos: campos faltantes, formatos inválidos y posibles duplicados. Entrega diagnóstico y correcciones.",
  },
];

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
  source: "markdown" | "csv" | "json";
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function buildWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "¡Hola! Soy tu asistente de análisis documental.\n\n" +
      "Puedo ayudarte a:\n" +
      "- 📊 Extraer datos y tablas estructuradas\n" +
      "- 🔍 Detectar inconsistencias y riesgos\n" +
      "- 📝 Generar resúmenes ejecutivos\n" +
      "- ✅ Crear checklists de cumplimiento\n\n" +
      "Selecciona un tipo de análisis o escribe tu consulta directamente.",
    timestamp: new Date(),
  };
}

function createSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateId("chat"),
    title: "Nueva sesión",
    createdAt: now,
    updatedAt: now,
    messages: [buildWelcomeMessage()],
  };
}

function deriveSessionTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "Nueva sesión";

  const base = firstUserMessage.content.trim();
  if (!base) return "Nueva sesión";
  return base.length > 46 ? `${base.slice(0, 46)}...` : base;
}

function formatSessionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Reciente";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMessageTime(value: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function normalizeDocumentStatus(status: string): string {
  return status.toLowerCase();
}

function normalizeMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const role = value.role === "user" || value.role === "assistant" ? value.role : null;
  const content = typeof value.content === "string" ? value.content : null;
  if (!role || !content) return null;

  const timestampCandidate = new Date(
    typeof value.timestamp === "string" || value.timestamp instanceof Date
      ? value.timestamp
      : Date.now(),
  );

  const parsedSources = Array.isArray(value.sources)
    ? value.sources
        .map((source) => {
          if (!source || typeof source !== "object") return null;
          const parsed = source as Record<string, unknown>;
          if (
            typeof parsed.documentId !== "string" ||
            typeof parsed.documentName !== "string" ||
            typeof parsed.chunkContent !== "string" ||
            typeof parsed.chunkIndex !== "number" ||
            typeof parsed.similarity !== "number"
          ) {
            return null;
          }

          return {
            documentId: parsed.documentId,
            documentName: parsed.documentName,
            chunkContent: parsed.chunkContent,
            chunkIndex: parsed.chunkIndex,
            similarity: parsed.similarity,
          };
        })
        .filter((source): source is NonNullable<typeof source> => source !== null)
    : undefined;

  return {
    id: typeof value.id === "string" ? value.id : generateId("msg"),
    role,
    content,
    sources: parsedSources,
    processingTime: typeof value.processingTime === "number" ? value.processingTime : undefined,
    timestamp: Number.isNaN(timestampCandidate.getTime()) ? new Date() : timestampCandidate,
  };
}

function normalizeSession(raw: unknown): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const id = typeof value.id === "string" ? value.id : generateId("chat");
  const messages = Array.isArray(value.messages)
    ? value.messages
        .map((message) => normalizeMessage(message))
        .filter((message): message is ChatMessage => message !== null)
    : [buildWelcomeMessage()];

  const createdAt =
    typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString();
  const updatedAt =
    typeof value.updatedAt === "string" ? value.updatedAt : createdAt;

  return {
    id,
    title:
      typeof value.title === "string" && value.title.trim().length > 0
        ? value.title
        : deriveSessionTitle(messages),
    createdAt,
    updatedAt,
    messages: messages.length > 0 ? messages : [buildWelcomeMessage()],
  };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseMarkdownTable(content: string): ParsedTable | null {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < lines.length - 2; i++) {
    const headerLine = lines[i];
    const dividerLine = lines[i + 1];

    if (!headerLine.includes("|") || !dividerLine.includes("-")) continue;

    const dividerClean = dividerLine.replace(/\|/g, "").replace(/:/g, "").replace(/\s+/g, "");
    if (!/^[-]+$/.test(dividerClean)) continue;

    const headers = headerLine
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (headers.length < 2) continue;

    const rows: string[][] = [];

    for (let j = i + 2; j < lines.length; j++) {
      const rowLine = lines[j];
      if (!rowLine.includes("|")) break;

      const cells = rowLine
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

      if (cells.length === headers.length) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      return { headers, rows, source: "markdown" };
    }
  }

  return null;
}

function parseJsonTable(content: string): ParsedTable | null {
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const candidate = jsonBlockMatch?.[1]?.trim();
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const objects = parsed.filter(
      (item) => item && typeof item === "object" && !Array.isArray(item),
    ) as Record<string, unknown>[];

    if (objects.length === 0) return null;

    const headerSet = new Set<string>();
    objects.forEach((row) => {
      Object.keys(row).forEach((key) => headerSet.add(key));
    });

    const headers = Array.from(headerSet);
    if (headers.length < 2 || headers.length > 10) return null;

    const rows = objects.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "string") return value;
        return String(value);
      }),
    );

    return { headers, rows, source: "json" };
  } catch {
    return null;
  }
}

function parseCsvTable(content: string): ParsedTable | null {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes(","));

  if (lines.length < 2) return null;

  const header = splitCsvLine(lines[0]);
  if (header.length < 2 || header.length > 10) return null;

  const rows = lines.slice(1).map(splitCsvLine).filter((cells) => cells.length === header.length);
  if (rows.length === 0) return null;

  return {
    headers: header,
    rows,
    source: "csv",
  };
}

function parseStructuredTable(content: string): ParsedTable | null {
  const markdownTable = parseMarkdownTable(content);
  if (markdownTable) return markdownTable;

  const jsonTable = parseJsonTable(content);
  if (jsonTable) return jsonTable;

  const csvTable = parseCsvTable(content);
  if (csvTable) return csvTable;

  return null;
}

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisModeId>("custom");
  const [isLoading, setIsLoading] = useState(false);
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => [createSession()]);
  const [activeChatId, setActiveChatId] = useState("");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const [messageViewModes, setMessageViewModes] = useState<Record<string, "text" | "table">>({});

  /* ── New UI state ── */
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [showSessionsMenu, setShowSessionsMenu] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);

  const sessionsMenuRef = useRef<HTMLDivElement | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const historyBtnRef = useRef<HTMLButtonElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeChatId) ?? sessions[0],
    [sessions, activeChatId],
  );

  const activeMessages = activeSession?.messages ?? [];

  const messageTables = useMemo(() => {
    const map = new Map<string, ParsedTable>();

    activeMessages.forEach((message) => {
      if (message.role !== "assistant") return;
      const parsedTable = parseStructuredTable(message.content);
      if (parsedTable) {
        map.set(message.id, parsedTable);
      }
    });

    return map;
  }, [activeMessages]);

  const completedDocuments = useMemo(
    () =>
      documents
        .filter((doc) => normalizeDocumentStatus(doc.status) === "completed")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [documents],
  );

  const selectedDocuments = useMemo(
    () => completedDocuments.filter((doc) => selectedDocumentIds.includes(doc.id)),
    [completedDocuments, selectedDocumentIds],
  );

  const hasScopeSelection = scopeMode === "all" || selectedDocumentIds.length > 0;

  const canSend = useMemo(
    () =>
      question.trim().length > 0 &&
      question.trim().length <= MAX_QUESTION_LENGTH &&
      !isLoading &&
      Boolean(activeSession) &&
      hasScopeSelection,
    [question, isLoading, activeSession, hasScopeSelection],
  );

  const scopeSummary =
    scopeMode === "all"
      ? `Todos (${completedDocuments.length})`
      : selectedDocumentIds.length > 0
        ? `${selectedDocumentIds.length} seleccionado(s)`
        : "Sin selección";

  const totalAssistantResponses = useMemo(
    () => activeMessages.filter((message) => message.role === "assistant").length,
    [activeMessages],
  );

  const activeAnalysisMode = useMemo(
    () => ANALYSIS_MODES.find((mode) => mode.id === analysisMode) ?? ANALYSIS_MODES[0],
    [analysisMode],
  );

  const isNewConversation = useMemo(
    () => activeMessages.filter((m) => m.role === "user").length === 0,
    [activeMessages],
  );

  /* ── Click outside to close sessions menu ── */
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      sessionsMenuRef.current &&
      !sessionsMenuRef.current.contains(e.target as Node) &&
      !historyBtnRef.current?.contains(e.target as Node)
    ) {
      setShowSessionsMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showSessionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSessionsMenu, handleClickOutside]);

  /* ── Effects ── */

  useEffect(() => {
    if (activeChatId || sessions.length === 0) return;
    setActiveChatId(sessions[0].id);
  }, [activeChatId, sessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawSessions = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
      const parsedSessions = rawSessions ? JSON.parse(rawSessions) : [];
      const normalizedSessions = Array.isArray(parsedSessions)
        ? parsedSessions
            .map((session) => normalizeSession(session))
            .filter((session): session is ChatSession => session !== null)
        : [];

      if (normalizedSessions.length > 0) {
        setSessions(normalizedSessions);

        const storedActiveChatId = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
        const existingActiveSession = normalizedSessions.find(
          (session) => session.id === storedActiveChatId,
        );
        setActiveChatId(existingActiveSession?.id ?? normalizedSessions[0].id);
      } else {
        const fallbackSession = createSession();
        setSessions([fallbackSession]);
        setActiveChatId(fallbackSession.id);
      }
    } catch {
      const fallbackSession = createSession();
      setSessions([fallbackSession]);
      setActiveChatId(fallbackSession.id);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return;

    const serializableSessions = sessions.map((session) => ({
      ...session,
      messages: session.messages.map((message) => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      })),
    }));

    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(serializableSessions));
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
    }
  }, [sessions, activeChatId, hasHydrated]);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setDocumentsLoading(true);
      setDocumentsError("");
      try {
        const docs = await getDocuments();
        if (cancelled) return;
        setDocuments(docs);
      } catch {
        if (cancelled) return;
        setDocumentsError(
          "No se pudieron cargar los documentos. Puedes seguir consultando en alcance general.",
        );
      } finally {
        if (!cancelled) {
          setDocumentsLoading(false);
        }
      }
    };

    void loadDocuments();
    const intervalId = window.setInterval(() => void loadDocuments(), 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setSelectedDocumentIds((current) =>
      current.filter((docId) => completedDocuments.some((doc) => doc.id === docId)),
    );
  }, [completedDocuments]);

  useEffect(() => {
    if (!animatedMessageId) return;

    const targetMessage = activeMessages.find((message) => message.id === animatedMessageId);
    if (!targetMessage) {
      setAnimatedMessageId(null);
      return;
    }

    const words = targetMessage.content.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      setAnimatedMessageId(null);
      return;
    }

    const intervalId = setInterval(() => {
      setVisibleWordCount((current) => {
        if (current >= words.length) {
          clearInterval(intervalId);
          setAnimatedMessageId(null);
          return words.length;
        }

        return current + 1;
      });
    }, 35);

    return () => clearInterval(intervalId);
  }, [animatedMessageId, activeMessages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 40);

    return () => window.clearTimeout(timeoutId);
  }, [activeMessages, isLoading, activeChatId]);

  /* Auto-resize textarea */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [question]);

  /* ── Handlers ── */

  function appendMessageToSession(sessionId: string, message: ChatMessage): void {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) return session;

        const nextMessages = [...session.messages, message];
        return {
          ...session,
          messages: nextMessages,
          title: deriveSessionTitle(nextMessages),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  function handleNewChat(): void {
    const newSession = createSession();
    setSessions((current) => [newSession, ...current]);
    setActiveChatId(newSession.id);
    setQuestion("");
    setAnimatedMessageId(null);
    setVisibleWordCount(0);
    setAnalysisMode("custom");
    setMessageViewModes({});
    setExpandedSources({});
    setShowSessionsMenu(false);
  }

  function handleOpenChat(sessionId: string): void {
    setActiveChatId(sessionId);
    setAnimatedMessageId(null);
    setVisibleWordCount(0);
    setShowSessionsMenu(false);
  }

  function toggleDocumentSelection(docId: string): void {
    setSelectedDocumentIds((current) =>
      current.includes(docId)
        ? current.filter((value) => value !== docId)
        : [...current, docId],
    );
  }

  function applyQuickPrompt(prompt: string): void {
    setQuestion(prompt);
    setAnalysisMode("custom");
    textareaRef.current?.focus();
  }

  function applyAnalysisMode(modeId: AnalysisModeId): void {
    setAnalysisMode(modeId);

    const mode = ANALYSIS_MODES.find((item) => item.id === modeId);
    if (!mode || mode.id === "custom") {
      textareaRef.current?.focus();
      return;
    }

    setQuestion(mode.template);
    textareaRef.current?.focus();
  }

  function toggleSourceExpansion(messageId: string): void {
    setExpandedSources((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  }

  function handleDeleteSession(sessionId: string, e: React.MouseEvent): void {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    setSessions((current) => current.filter((s) => s.id !== sessionId));
    if (activeChatId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setActiveChatId(remaining[0]?.id ?? "");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isLoading || !activeSession) return;

    if (scopeMode === "selected" && selectedDocumentIds.length === 0) {
      const guardMessage: ChatMessage = {
        id: `guard-${Date.now()}`,
        role: "assistant",
        content:
          "Para usar alcance por selección, primero marca al menos un documento en el panel de configuración.",
        timestamp: new Date(),
      };
      appendMessageToSession(activeSession.id, guardMessage);
      return;
    }

    const targetSessionId = activeSession.id;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: cleanQuestion,
      timestamp: new Date(),
    };

    appendMessageToSession(targetSessionId, userMessage);
    setQuestion("");
    setIsLoading(true);

    try {
      // Build systemHint from active analysis mode
      const hint =
        analysisMode !== "custom" ? activeAnalysisMode.template : undefined;

      const result = await queryRAG(cleanQuestion, {
        documentIds: scopeMode === "selected" ? selectedDocumentIds : undefined,
        systemHint: hint,
      });

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        processingTime: result.processingTime,
        timestamp: new Date(),
      };

      appendMessageToSession(targetSessionId, assistantMessage);
      setAnimatedMessageId(assistantMessage.id);
      setVisibleWordCount(0);
    } catch (error: unknown) {
      const assistantMessage: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "No fue posible completar la consulta. Verifica backend, OpenRouter y documentos indexados.",
        timestamp: new Date(),
      };
      appendMessageToSession(targetSessionId, assistantMessage);
    } finally {
      setIsLoading(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ══════════════════════════════════════════════════
          MAIN CHAT AREA (full width)
          ══════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* ── Chat header ── */}
        <header className="flex-none flex items-center justify-between gap-3 border-b border-outline-variant/15 bg-surface-container-lowest/80 px-4 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* AI avatar + title */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-tertiary-fixed-dim/15">
              <span className="material-symbols-outlined text-base text-primary">smart_toy</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-on-surface">Cognitive Architect</h1>
              <p className="text-[10px] text-on-surface-variant">
                {activeSession?.title || "Nueva sesión"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats badges */}
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 bg-surface-container px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-[11px] text-primary">description</span>
                {completedDocuments.length}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 bg-surface-container px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-[11px] text-tertiary-fixed-dim">forum</span>
                {totalAssistantResponses}
              </span>
            </div>

            {/* Scope quick indicator */}
            <span className="hidden items-center gap-1 rounded-full border border-outline-variant/20 bg-surface-container px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant md:inline-flex">
              <span className="material-symbols-outlined text-[11px] text-success">folder</span>
              {scopeSummary}
            </span>

            {/* ── Sessions dropdown trigger ── */}
            <div className="relative">
              <button
                ref={historyBtnRef}
                type="button"
                onClick={() => setShowSessionsMenu((v) => !v)}
                className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 transition ${
                  showSessionsMenu
                    ? "border-primary/30 bg-primary-fixed text-primary"
                    : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-lg">history</span>
                <span className="hidden text-[11px] font-semibold sm:inline">
                  {sessions.length} sesiones
                </span>
                <span
                  className="material-symbols-outlined text-sm transition-transform duration-200"
                  style={{ transform: showSessionsMenu ? "rotate(180deg)" : "none" }}
                >
                  expand_more
                </span>
              </button>

              {/* ── Sessions floating panel ── */}
              {showSessionsMenu && (
                <div
                  ref={sessionsMenuRef}
                  className="absolute right-0 top-full z-50 mt-2 w-72 animate-scale-in overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-lowest shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
                >
                  {/* Panel header */}
                  <div className="flex items-center justify-between border-b border-outline-variant/15 px-4 py-3">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.08em]">Historial de sesiones</p>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="flex items-center gap-1 rounded-lg border border-outline-variant/20 bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:border-primary/30 hover:bg-primary-fixed"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Nueva
                    </button>
                  </div>

                  {/* Sessions list */}
                  <div className="max-h-72 overflow-y-auto p-2">
                    {sessions.map((session) => {
                      const isActive = session.id === activeSession?.id;
                      const msgCount = session.messages.filter((m) => m.role === "user").length;
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => handleOpenChat(session.id)}
                          className={`group flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition ${
                            isActive
                              ? "bg-primary-fixed"
                              : "hover:bg-surface-container-low"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined mt-0.5 shrink-0 text-base ${
                              isActive ? "fill text-primary" : "text-on-surface-variant/50"
                            }`}
                          >
                            chat_bubble
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${
                              isActive ? "text-primary" : "text-on-surface"
                            }`}>
                              {session.title}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-[10px] text-on-surface-variant/60">
                                {formatSessionDate(session.updatedAt)}
                              </span>
                              {msgCount > 0 && (
                                <span className="rounded-full bg-surface-container-high px-1.5 py-0.5 text-[9px] font-semibold text-on-surface-variant">
                                  {msgCount} msg
                                </span>
                              )}
                            </div>
                          </div>
                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-on-surface-variant/0 transition group-hover:text-on-surface-variant/40 hover:!text-error"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Panel footer */}
                  <div className="border-t border-outline-variant/15 px-4 py-2.5">
                    <p className="text-[10px] text-on-surface-variant/50">
                      💡 Define objetivo + formato + detalle para mejores resultados.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* New session quick action */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
              title="Nueva sesión"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </header>

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
            {activeMessages.map((message) => {
              const parsedTable = messageTables.get(message.id);
              const hasTable = Boolean(parsedTable);
              const isAnimating = message.role === "assistant" && message.id === animatedMessageId;
              const words = message.content.split(/\s+/).filter(Boolean);
              const animatedContent = isAnimating
                ? words.slice(0, visibleWordCount).join(" ")
                : message.content;
              const selectedViewMode =
                messageViewModes[message.id] ?? (hasTable && !isAnimating ? "table" : "text");
              const isSourcesOpen = expandedSources[message.id] === true;

              if (message.role === "user") {
                /* ── User message ── */
                return (
                  <div key={message.id} className="flex justify-end gap-3 animate-message-in">
                    <div className="max-w-[85%] md:max-w-[75%]">
                      <div className="mb-1.5 flex items-center justify-end gap-2">
                        <span className="text-[10px] text-on-surface-variant/60">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        <span className="text-[11px] font-semibold text-primary">Tú</span>
                      </div>
                      <div className="chat-bubble-user">
                        <p className="type-body whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                    <div className="chat-avatar chat-avatar-user mt-6">
                      <span className="material-symbols-outlined text-sm text-primary">person</span>
                    </div>
                  </div>
                );
              }

              /* ── Assistant message ── */
              return (
                <div key={message.id} className="flex gap-3 animate-message-in">
                  <div className="chat-avatar chat-avatar-assistant mt-6">
                    <span className="material-symbols-outlined text-sm text-tertiary-fixed-dim">
                      smart_toy
                    </span>
                  </div>
                  <div className="max-w-[95%] md:max-w-[90%] min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-tertiary-fixed-dim">
                        Asistente IA
                      </span>
                      <span className="text-[10px] text-on-surface-variant/60">
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {typeof message.processingTime === "number" && (
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[9px] font-medium text-on-surface-variant">
                          ⚡ {formatProcessingTime(message.processingTime)}
                        </span>
                      )}
                    </div>

                    <div className="chat-bubble-assistant">
                      {/* Table/Text toggle */}
                      {hasTable && !isAnimating && (
                        <div className="mb-3 inline-flex rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setMessageViewModes((c) => ({ ...c, [message.id]: "table" }))
                            }
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                              selectedViewMode === "table"
                                ? "bg-primary text-on-primary"
                                : "text-on-surface-variant hover:text-primary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[10px]">table_chart</span>
                            Tabla
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMessageViewModes((c) => ({ ...c, [message.id]: "text" }))
                            }
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                              selectedViewMode === "text"
                                ? "bg-primary text-on-primary"
                                : "text-on-surface-variant hover:text-primary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[10px]">article</span>
                            Texto
                          </button>
                        </div>
                      )}

                      {/* Content: table or markdown */}
                      {selectedViewMode === "table" && parsedTable ? (
                        <div className="overflow-hidden rounded-lg border border-outline-variant/15 bg-surface-container-lowest">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-surface-container-low">
                                <tr>
                                  {parsedTable.headers.map((header) => (
                                    <th
                                      key={`${message.id}-h-${header}`}
                                      className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {parsedTable.rows.map((row, rIdx) => (
                                  <tr
                                    key={`${message.id}-r-${rIdx}`}
                                    className="border-t border-outline-variant/15"
                                  >
                                    {row.map((cell, cIdx) => (
                                      <td
                                        key={`${message.id}-c-${rIdx}-${cIdx}`}
                                        className="px-3 py-2 align-top text-sm text-on-surface"
                                      >
                                        {cell || "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="border-t border-outline-variant/15 bg-surface-container-low px-3 py-1.5 text-[10px] text-on-surface-variant">
                            Vista estructurada ({parsedTable.source}) · {parsedTable.rows.length} filas
                          </p>
                        </div>
                      ) : (
                        <div className="chat-markdown type-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {animatedContent}
                          </ReactMarkdown>
                          {isAnimating && <span className="chat-caret" aria-hidden="true" />}
                        </div>
                      )}

                      {/* Sources accordion */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 border-t border-outline-variant/15 pt-3">
                          <button
                            type="button"
                            onClick={() => toggleSourceExpansion(message.id)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant transition hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-sm transition-transform duration-200"
                              style={{ transform: isSourcesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                            >
                              expand_more
                            </span>
                            {message.sources.length} fuente{message.sources.length > 1 ? "s" : ""} de
                            evidencia
                          </button>

                          {isSourcesOpen && (
                            <div className="mt-2 space-y-2 animate-fade-in">
                              {message.sources.map((source) => (
                                <div
                                  key={`${message.id}-${source.documentId}-${source.chunkIndex}`}
                                  className="rounded-lg border border-outline-variant/15 bg-surface-container-lowest p-2.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs text-primary">
                                      description
                                    </span>
                                    <p className="text-[11px] font-medium text-primary">
                                      {source.documentName}
                                    </p>
                                    <span className="rounded-full bg-surface-container-high px-1.5 py-0.5 text-[9px] text-on-surface-variant">
                                      Frag. {source.chunkIndex + 1}
                                    </span>
                                    <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-medium text-success">
                                      {Math.round(source.similarity * 100)}%
                                    </span>
                                  </div>
                                  <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-on-surface-variant/80">
                                    {source.chunkContent}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-message-in">
                <div className="chat-avatar chat-avatar-assistant">
                  <span className="material-symbols-outlined text-sm text-tertiary-fixed-dim">
                    smart_toy
                  </span>
                </div>
                <div className="chat-bubble-assistant">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-on-surface-variant">Analizando documentos</span>
                    <span className="chat-typing-dots" aria-hidden="true">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            BOTTOM COMPOSER + INLINE CONFIG
            ══════════════════════════════════════════════════ */}
        <div className="floating-composer flex-none pb-20 lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-3">
            {/* ── Quick prompts (new conversation only) ── */}
            {isNewConversation && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyQuickPrompt(item.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/20 bg-surface-container px-3 py-1.5 text-[11px] font-medium text-on-surface-variant transition hover:border-primary/25 hover:bg-primary-fixed hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-xs">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Analysis mode pills (wrapped row) ── */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/50">Modo</span>
              {ANALYSIS_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => applyAnalysisMode(mode.id)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    analysisMode === mode.id
                      ? "border-primary/30 bg-primary-fixed text-primary"
                      : "border-outline-variant/20 text-on-surface-variant/70 hover:border-primary/25 hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[11px]">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>

            {/* ── Input form ── */}
            <form ref={formRef} onSubmit={handleSubmit}>
              <div className="flex items-end gap-2 rounded-2xl border border-outline-variant/25 bg-surface-container-low px-3 py-2 transition-colors focus-within:border-primary/35 focus-within:bg-surface-container">
                {/* Analysis mode chip inside input */}
                {analysisMode !== "custom" && (
                  <div className="mb-1 flex shrink-0 items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-semibold text-primary">
                    <span className="material-symbols-outlined text-[10px]">
                      {activeAnalysisMode.icon}
                    </span>
                    {activeAnalysisMode.label}
                    <button
                      type="button"
                      onClick={() => setAnalysisMode("custom")}
                      className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-primary/20"
                    >
                      <span className="material-symbols-outlined text-[9px]">close</span>
                    </button>
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  id="question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={1}
                  maxLength={MAX_QUESTION_LENGTH + 200}
                  placeholder="Escribe tu consulta sobre los documentos..."
                  className="flex-1 resize-none border-none bg-transparent py-1 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                  style={{ maxHeight: "160px" }}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                      event.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }}
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!canSend}
                  className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
              </div>

              {/* ── Bottom meta bar with scope controls ── */}
              <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  {/* Scope toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDocPicker((v) => !v)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                        scopeMode === "selected" && selectedDocumentIds.length > 0
                          ? "border-primary/25 bg-primary-fixed text-primary"
                          : "border-outline-variant/20 text-on-surface-variant/60 hover:text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[11px]">folder</span>
                      {scopeSummary}
                      <span
                        className="material-symbols-outlined text-[9px] transition-transform duration-200"
                        style={{ transform: showDocPicker ? "rotate(180deg)" : "none" }}
                      >
                        expand_more
                      </span>
                    </button>

                    {/* Document picker popup (floating above) */}
                    {showDocPicker && (
                      <div className="absolute bottom-full left-0 z-50 mb-2 w-72 animate-scale-in overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-container-lowest shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                        <div className="flex items-center justify-between border-b border-outline-variant/15 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">Alcance de documentos</p>
                          <div className="inline-flex rounded-md border border-outline-variant/25 bg-surface-container p-0.5">
                            <button
                              type="button"
                              onClick={() => setScopeMode("all")}
                              className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold transition ${
                                scopeMode === "all" ? "bg-primary text-on-primary" : "text-on-surface-variant"
                              }`}
                            >
                              Todo
                            </button>
                            <button
                              type="button"
                              onClick={() => setScopeMode("selected")}
                              className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold transition ${
                                scopeMode === "selected" ? "bg-primary text-on-primary" : "text-on-surface-variant"
                              }`}
                            >
                              Filtrar
                            </button>
                          </div>
                        </div>

                        {scopeMode === "selected" && (
                          <div className="max-h-40 overflow-y-auto p-2">
                            {documentsLoading ? (
                              <p className="p-2 text-xs text-on-surface-variant">Cargando...</p>
                            ) : completedDocuments.length === 0 ? (
                              <p className="p-2 text-[11px] text-warning">Sin documentos completados.</p>
                            ) : (
                              <div className="space-y-0.5">
                                {completedDocuments.map((doc) => {
                                  const isSelected = selectedDocumentIds.includes(doc.id);
                                  return (
                                    <button
                                      key={doc.id}
                                      type="button"
                                      onClick={() => toggleDocumentSelection(doc.id)}
                                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition ${
                                        isSelected ? "bg-primary-fixed" : "hover:bg-surface-container-low"
                                      }`}
                                    >
                                      <span className={`material-symbols-outlined text-xs ${
                                        isSelected ? "text-primary" : "text-on-surface-variant/40"
                                      }`}>
                                        {isSelected ? "check_circle" : "radio_button_unchecked"}
                                      </span>
                                      <span className={`truncate text-[11px] font-medium ${
                                        isSelected ? "text-primary" : "text-on-surface"
                                      }`}>
                                        {doc.originalName}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {scopeMode === "all" && (
                          <div className="px-3 py-2.5">
                            <p className="text-[11px] text-on-surface-variant/60">
                              Consultando los {completedDocuments.length} documentos disponibles.
                            </p>
                          </div>
                        )}

                        {documentsError && (
                          <p className="border-t border-outline-variant/15 px-3 py-2 text-[10px] text-warning">{documentsError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-on-surface-variant/30">·</span>
                  <span className="text-[10px] text-on-surface-variant/40">
                    Ctrl+Enter para enviar
                  </span>
                </div>

                <p
                  className={`text-[10px] ${
                    question.length > MAX_QUESTION_LENGTH
                      ? "text-error"
                      : "text-on-surface-variant/40"
                  }`}
                >
                  {question.length}/{MAX_QUESTION_LENGTH}
                </p>
              </div>

              {/* Scope warning */}
              {scopeMode === "selected" && selectedDocumentIds.length === 0 && (
                <p className="mt-2 rounded-lg border border-warning/20 bg-warning/8 px-3 py-2 text-[11px] text-warning">
                  <span className="material-symbols-outlined mr-1 align-middle text-xs">info</span>
                  Selecciona documentos desde el botón de alcance o cambia a &ldquo;Todo&rdquo;.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
