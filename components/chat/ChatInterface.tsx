"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Plus,
  LogOut,
  Settings,
  AlertTriangle,
  User,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/app/api/chat/route";

interface Props {
  user: { name: string; email: string; role: string };
}

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "IA Corporativa";

const WELCOME_MESSAGE = `¡Hola! Soy tu asistente de IA corporativo.

Puedo ayudarte con:
- **Redacción** de documentos, emails y presentaciones
- **Análisis** de datos e informes
- **Código** y soporte técnico
- **Traducción** y revisión de textos
- **Investigación** y síntesis de información
- **Brainstorming** y resolución de problemas

*¿En qué puedo ayudarte hoy?*`;

export default function ChatInterface({ user }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleNewChat = () => {
    setMessages([]);
    setBlockedMessage(null);
    setInput("");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setBlockedMessage(null);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      // Mensajes bloqueados vienen como JSON (content-type: application/json)
      // Respuestas normales vienen como SSE (content-type: text/event-stream)
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok || contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        if (data?.blocked) {
          setBlockedMessage(data.message);
          setMessages((prev) => prev.slice(0, -1));
        } else {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        setIsLoading(false);
        return;
      }

      // Streaming SSE
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantText,
                  };
                  return updated;
                });
              }
            } catch {
              // ignorar líneas malformadas
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Ha ocurrido un error al procesar tu consulta. Por favor, inténtalo de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-900 flex flex-col text-white flex-shrink-0">
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-6 h-6 text-blue-300" />
            <span className="font-semibold text-sm">{COMPANY_NAME}</span>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 bg-blue-700 hover:bg-blue-600 transition-colors rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva conversación
          </button>
        </div>

        <div className="flex-1 p-4">
          <p className="text-blue-300 text-xs uppercase font-semibold tracking-wider mb-2">
            Uso corporativo
          </p>
          <p className="text-blue-200 text-xs leading-relaxed">
            Este asistente está configurado para consultas profesionales.
            No procesa datos personales ni información de salud.
          </p>
        </div>

        {/* Footer usuario */}
        <div className="p-4 border-t border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-blue-300 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {user.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-200 hover:text-white bg-blue-800 hover:bg-blue-700 rounded-md py-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-200 hover:text-white bg-blue-800 hover:bg-blue-700 rounded-md py-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Área principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
          {/* Mensaje de bienvenida */}
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-5 py-4 max-w-2xl">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm max-w-none"
                  >
                    {WELCOME_MESSAGE}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Historial */}
          {messages.map((msg, i) => (
            <div key={i} className="max-w-3xl mx-auto">
              <div
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    msg.role === "user"
                      ? "bg-gray-700"
                      : "bg-brand-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`rounded-2xl px-5 py-4 shadow-sm max-w-2xl ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-tr-sm"
                      : "bg-white rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm max-w-none"
                    >
                      {msg.content || "▌"}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Indicador cargando */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-5 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Mensaje bloqueado */}
          {blockedMessage && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{blockedMessage}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextarea();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta corporativa..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-40"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Este asistente no procesa datos personales ni información de salud · RGPD
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
