"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { queryRAG } from "@/lib/api";
import type { ChatMessage } from "@/types";

const CHAT_SESSIONS_STORAGE_KEY = "rag_chat_sessions_v1";
const ACTIVE_CHAT_STORAGE_KEY = "rag_active_chat_id_v1";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function buildWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "Haz una pregunta sobre tus documentos. Si no hay contenido indexado, te avisare para que subas o proceses archivos primero.",
    timestamp: new Date(),
  };
}

function createSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateId("chat"),
    title: "Nuevo chat",
    createdAt: now,
    updatedAt: now,
    messages: [buildWelcomeMessage()],
  };
}

function deriveSessionTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "Nuevo chat";

  const base = firstUserMessage.content.trim();
  if (!base) return "Nuevo chat";
  return base.length > 44 ? `${base.slice(0, 44)}...` : base;
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

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => [createSession()]);
  const [activeChatId, setActiveChatId] = useState("");

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeChatId) ?? sessions[0],
    [sessions, activeChatId],
  );
  const activeMessages = activeSession?.messages ?? [];
  const canSend = useMemo(
    () => question.trim().length > 0 && !isLoading && Boolean(activeSession),
    [question, isLoading, activeSession],
  );

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
  }

  function handleOpenChat(sessionId: string): void {
    setActiveChatId(sessionId);
    setAnimatedMessageId(null);
    setVisibleWordCount(0);
  }

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
    }, 40);

    return () => clearInterval(intervalId);
  }, [animatedMessageId, activeMessages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isLoading || !activeSession) return;

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
      const result = await queryRAG(cleanQuestion);
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
    } catch (error: any) {
      const assistantMessage: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content:
          error?.message ||
          "No fue posible completar la consulta. Verifica que backend y servicios IA esten activos.",
        timestamp: new Date(),
      };
      appendMessageToSession(targetSessionId, assistantMessage);
    } finally {
      setIsLoading(false);
    }
  }

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
            <span className="meta-kicker-text">Asistente RAG activo</span>
          </div>
          <h1 className="type-h1 text-primary">Consultas conversacionales</h1>
          <p className="type-body mt-3 max-w-3xl text-on-surface-variant">
            Pregunta sobre tus documentos indexados. Las respuestas incluyen contexto recuperado y fuentes cuando existan coincidencias.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="ambient-shadow rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 lg:col-span-4 xl:col-span-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:opacity-95"
          >
            <span className="material-symbols-outlined text-base">add_comment</span>
            Nuevo chat
          </button>

          <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSession?.id;
              const firstUserMessage =
                session.messages.find((message) => message.role === "user")?.content ||
                "Conversacion lista para empezar";

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleOpenChat(session.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-primary/30 bg-primary-fixed text-primary"
                      : "border-outline-variant/25 bg-surface-container-low text-on-surface hover:border-primary/25"
                  }`}
                >
                  <p className="type-title-sm truncate">{session.title}</p>
                  <p className="type-caption mt-1 line-clamp-2 text-on-surface-variant">
                    {firstUserMessage}
                  </p>
                  <p className="type-caption mt-1 text-on-surface-variant/80">
                    {formatSessionDate(session.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="ambient-shadow rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 md:p-6 lg:col-span-8 xl:col-span-9">
          <div className="mb-3 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2">
            <p className="type-caption text-on-surface-variant">Sesion activa</p>
            <p className="type-title-sm text-primary">{activeSession?.title || "Nuevo chat"}</p>
          </div>

          <div className="mb-4 max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 md:p-4">
          {activeMessages.map((message) => (
            (() => {
              const isAnimating =
                message.role === "assistant" && message.id === animatedMessageId;
              const words = message.content.split(/\s+/).filter(Boolean);
              const animatedContent = isAnimating
                ? words.slice(0, visibleWordCount).join(" ")
                : message.content;

              return (
            <article
              key={message.id}
              className={`rounded-xl border p-3 md:p-4 ${
                message.role === "user"
                  ? "ml-auto max-w-[90%] border-primary/20 bg-primary-fixed text-primary md:max-w-[80%]"
                  : "mr-auto max-w-[100%] border-outline-variant/25 bg-surface-container-lowest text-on-surface md:max-w-[92%]"
              }`}
            >
              <p className="type-caption mb-2 text-on-surface-variant">
                {message.role === "user" ? "Tu pregunta" : "Asistente IA"}
              </p>
              {message.role === "assistant" ? (
                <div className="chat-markdown type-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {animatedContent}
                  </ReactMarkdown>
                  {isAnimating && <span className="chat-caret" aria-hidden="true" />}
                </div>
              ) : (
                <p className="type-body whitespace-pre-wrap">{message.content}</p>
              )}

              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="pill-label">Fuentes</p>
                  {message.sources.map((source) => (
                    <div
                      key={`${message.id}-${source.documentId}-${source.chunkIndex}`}
                      className="rounded-lg border border-outline-variant/25 bg-surface-container-low p-2"
                    >
                      <p className="type-caption text-primary">
                        {source.documentName} - chunk {source.chunkIndex + 1} - sim {source.similarity}
                      </p>
                      <p className="type-caption mt-1 text-on-surface-variant whitespace-pre-wrap">
                        {source.chunkContent}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {typeof message.processingTime === "number" && (
                <p className="type-caption mt-3 text-on-surface-variant">
                  Tiempo de respuesta: {message.processingTime} ms
                </p>
              )}
            </article>
              );
            })()
          ))}

          {isLoading && (
            <article className="mr-auto max-w-[92%] rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-3 md:p-4">
              <p className="type-caption mb-2 text-on-surface-variant">Asistente IA</p>
              <p className="type-body flex items-center gap-2 text-on-surface-variant">
                Generando respuesta
                <span className="chat-typing-dots" aria-hidden="true">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </span>
              </p>
            </article>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="question" className="pill-label">Tu consulta</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            placeholder="Ejemplo: Que fechas clave aparecen en el contrato y a que clausulas corresponden?"
            className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="type-caption text-on-surface-variant">
              Consejo: mientras mas especifica sea tu pregunta, mejor sera la recuperacion de fragmentos.
            </p>
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">send</span>
              Consultar
            </button>
          </div>
        </form>
        </section>
      </div>
    </div>
  );
}
