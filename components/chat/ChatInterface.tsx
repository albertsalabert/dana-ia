"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Plus, LogOut, Settings, AlertTriangle,
  User, Loader2, Trash2, MessageSquare, ExternalLink, FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/app/api/chat/route";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  user: { name: string; email: string; role: string };
  initialConversations: Conversation[];
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

function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const week = new Date(today.getTime() - 7 * 86400000);
  const month = new Date(today.getTime() - 30 * 86400000);

  const groups: Record<string, Conversation[]> = {
    "Hoy": [],
    "Ayer": [],
    "Últimos 7 días": [],
    "Últimos 30 días": [],
    "Anteriores": [],
  };

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (d >= today) groups["Hoy"].push(c);
    else if (d >= yesterday) groups["Ayer"].push(c);
    else if (d >= week) groups["Últimos 7 días"].push(c);
    else if (d >= month) groups["Últimos 30 días"].push(c);
    else groups["Anteriores"].push(c);
  }

  return groups;
}

export default function ChatInterface({ user, initialConversations }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    setActiveConversationId(null);
    setMessages([]);
    setBlockedMessage(null);
    setInput("");
  };

  const handleLoadConversation = async (id: string) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    setBlockedMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) handleNewChat();
    setDeletingId(null);
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

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          conversationId: activeConversationId,
        }),
      });

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

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let assistantText = "";
      let newConversationId: string | null = null;

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              assistantText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
            if (parsed.done && parsed.conversationId) {
              newConversationId = parsed.conversationId;
            }
          } catch {
            // ignorar líneas malformadas
          }
        }
      }

      // Actualizar lista de conversaciones
      if (newConversationId && !activeConversationId) {
        setActiveConversationId(newConversationId);
        const title = text.length > 60 ? text.slice(0, 57) + "..." : text;
        const newConv: Conversation = {
          id: newConversationId,
          title,
          updated_at: new Date().toISOString(),
        };
        setConversations((prev) => [newConv, ...prev]);
      } else if (activeConversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, updated_at: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ha ocurrido un error al procesar tu consulta. Por favor, inténtalo de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, activeConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const groups = groupConversations(conversations);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-900 flex flex-col text-white flex-shrink-0">
        {/* Header */}
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

        {/* Historial de conversaciones */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {conversations.length === 0 ? (
            <p className="text-blue-300 text-xs text-center px-4 py-6">
              Aún no hay conversaciones
            </p>
          ) : (
            Object.entries(groups).map(([group, convs]) =>
              convs.length === 0 ? null : (
                <div key={group} className="mb-2">
                  <p className="text-blue-400 text-xs font-semibold px-4 py-1 uppercase tracking-wider">
                    {group}
                  </p>
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleLoadConversation(conv.id)}
                      className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                        activeConversationId === conv.id
                          ? "bg-blue-700"
                          : "hover:bg-blue-800"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                      <span className="text-sm text-blue-100 truncate flex-1 leading-snug">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        disabled={deletingId === conv.id}
                        className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-400 transition-all flex-shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>

        {/* Apps corporativas */}
        <div className="px-3 pb-2 border-t border-blue-800 pt-3">
          <p className="text-blue-400 text-xs font-semibold px-1 pb-2 uppercase tracking-wider">
            Apps
          </p>
          {[
            { label: "DANA PDF", href: "https://dana-pdf.vercel.app/", icon: FileText },
          ].map(({ label, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-blue-800 transition-colors group"
            >
              <Icon className="w-4 h-4 text-blue-300 flex-shrink-0" />
              <span className="text-sm text-blue-100 flex-1">{label}</span>
              <ExternalLink className="w-3 h-3 text-blue-500 group-hover:text-blue-300 flex-shrink-0" />
            </a>
          ))}
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
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
          {/* Bienvenida */}
          {messages.length === 0 && !isLoading && (
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-5 py-4 max-w-2xl">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {WELCOME_MESSAGE}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Mensajes */}
          {messages.map((msg, i) => (
            <div key={i} className="max-w-3xl mx-auto">
              <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    msg.role === "user" ? "bg-gray-700" : "bg-brand-600"
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                      {msg.content || "▌"}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Cargando */}
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

          {/* Bloqueado */}
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
                onChange={(e) => { setInput(e.target.value); adjustTextarea(); }}
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
