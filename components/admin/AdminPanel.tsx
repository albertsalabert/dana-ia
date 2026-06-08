"use client";

import { useState, useRef } from "react";
import {
  Users, UserPlus, ShieldCheck, Activity, ChevronLeft,
  CheckCircle, XCircle, ToggleLeft, ToggleRight, Bot,
  Eye, EyeOff, BookOpen, Plus, Trash2, FileText, Upload,
  Coins,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/lib/supabase";
import type { KnowledgeEntry } from "@/lib/knowledge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export interface AdminLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  users?: { email: string; name: string | null } | null;
}

interface Props {
  users: AppUser[];
  logs: AdminLog[];
  knowledge: KnowledgeEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  login: "Inicio de sesión",
  message_sent: "Mensaje enviado",
  message_blocked: "Mensaje bloqueado",
  user_created: "Usuario creado",
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-400",
  message_sent: "bg-blue-400",
  message_blocked: "bg-amber-400",
  user_created: "bg-purple-400",
};

export default function AdminPanel({ users: initialUsers, logs, knowledge: initialKnowledge }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [knowledge, setKnowledge] = useState(initialKnowledge);
  const [tab, setTab] = useState<"users" | "knowledge" | "logs">("users");

  // Users form
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" });
  const [showPassword, setShowPassword] = useState(false);
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [createError, setCreateError] = useState("");

  // Knowledge form
  const [kForm, setKForm] = useState({ title: "", content: "" });
  const [kStatus, setKStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [kError, setKError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  // ── Usuarios ──────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateStatus("loading");
    setCreateError("");
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setCreateStatus("ok");
      setForm({ email: "", name: "", password: "", role: "user" });
      setTimeout(() => { setCreateStatus("idle"); router.refresh(); }, 2000);
    } else {
      setCreateStatus("error");
      setCreateError(data.error || "Error al crear usuario");
    }
  }

  async function toggleUserActive(userId: string, currentActive: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, active: !currentActive }),
    });
    if (res.ok) setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, active: !currentActive } : u));
  }

  // ── Knowledge ─────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setKForm((prev) => ({
      title: prev.title || file.name.replace(/\.[^.]+$/, ""),
      content: text,
    }));
  }

  async function handleKnowledgeCreate(e: React.FormEvent) {
    e.preventDefault();
    setKStatus("loading");
    setKError("");
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: kForm.title, content: kForm.content }),
    });
    const data = await res.json();
    if (res.ok) {
      setKStatus("ok");
      const newEntry: KnowledgeEntry = {
        id: data.id,
        title: kForm.title,
        content: kForm.content,
        file_type: "text",
        active: true,
        created_at: new Date().toISOString(),
      };
      setKnowledge((prev) => [newEntry, ...prev]);
      setKForm({ title: "", content: "" });
      setTimeout(() => setKStatus("idle"), 2000);
    } else {
      setKStatus("error");
      setKError(data.error || "Error al guardar");
    }
  }

  async function toggleKnowledge(id: string, active: boolean) {
    await fetch("/api/admin/knowledge", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setKnowledge((prev) => prev.map((k) => k.id === id ? { ...k, active: !active } : k));
  }

  async function deleteKnowledge(id: string) {
    await fetch("/api/admin/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKnowledge((prev) => prev.filter((k) => k.id !== id));
  }

  // ── Métricas ──────────────────────────────────────────────
  const activeUsers = users.filter((u) => u.active).length;
  const blockedMessages = logs.filter((l) => l.action === "message_blocked").length;
  const totalTokens = logs
    .filter((l) => l.action === "message_sent")
    .reduce((sum, l) => sum + (l.input_tokens || 0) + (l.output_tokens || 0), 0);

  const TABS = [
    { key: "users", label: "Usuarios", icon: Users },
    { key: "knowledge", label: "Conocimiento", icon: BookOpen },
    { key: "logs", label: "Auditoría", icon: Activity },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/chat")} className="flex items-center gap-1.5 text-blue-300 hover:text-white text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver al chat
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <Bot className="w-5 h-5 text-blue-300" />
          <span className="font-semibold">Panel de Administración</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Users, val: users.length, label: "Usuarios totales", color: "text-brand-600" },
            { icon: CheckCircle, val: activeUsers, label: "Usuarios activos", color: "text-green-500" },
            { icon: ShieldCheck, val: blockedMessages, label: "Mensajes bloqueados", color: "text-amber-500" },
            { icon: Coins, val: totalTokens.toLocaleString(), label: "Tokens consumidos", color: "text-purple-500" },
          ].map(({ icon: Icon, val, label, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <Icon className={`w-8 h-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold text-gray-800">{val}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === key ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── TAB USUARIOS ── */}
        {tab === "users" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Usuarios registrados</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium flex-shrink-0">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.name || "—"}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                      {user.role}
                    </span>
                    <button onClick={() => toggleUserActive(user.id, user.active)} title={user.active ? "Desactivar" : "Activar"}>
                      {user.active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h2 className="font-semibold text-gray-800">Crear usuario</h2>
              </div>
              {createStatus === "ok" ? (
                <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-5 h-5" /> Usuario creado</div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@empresa.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre Apellido" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña *</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  {createStatus === "error" && <div className="flex items-center gap-1.5 text-red-600 text-xs"><XCircle className="w-4 h-4" />{createError}</div>}
                  <button type="submit" disabled={createStatus === "loading"} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                    <UserPlus className="w-4 h-4" />{createStatus === "loading" ? "Creando..." : "Crear usuario"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── TAB CONOCIMIENTO ── */}
        {tab === "knowledge" && (
          <div className="grid grid-cols-3 gap-6">
            {/* Lista de documentos */}
            <div className="col-span-2 space-y-3">
              {knowledge.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aún no hay documentos de conocimiento</p>
                  <p className="text-gray-400 text-xs mt-1">Añade documentos para que la IA los use en sus respuestas</p>
                </div>
              ) : (
                knowledge.map((entry) => (
                  <div key={entry.id} className={`bg-white rounded-xl border p-4 shadow-sm transition-opacity ${entry.active ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{entry.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.content.slice(0, 120)}...</p>
                          <p className="text-xs text-gray-300 mt-1">
                            {entry.content.length.toLocaleString()} caracteres · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => toggleKnowledge(entry.id, entry.active)} title={entry.active ? "Desactivar" : "Activar"}>
                          {entry.active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                        </button>
                        <button onClick={() => deleteKnowledge(entry.id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario nuevo documento */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-brand-600" />
                <h2 className="font-semibold text-gray-800">Añadir documento</h2>
              </div>

              {kStatus === "ok" ? (
                <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-5 h-5" />Documento guardado</div>
              ) : (
                <form onSubmit={handleKnowledgeCreate} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
                    <input type="text" required value={kForm.title} onChange={(e) => setKForm({ ...kForm, title: e.target.value })} placeholder="Ej: Manual de productos" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>

                  {/* Upload fichero */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subir fichero (.txt, .md, .csv)</label>
                    <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-brand-400 rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
                      <Upload className="w-4 h-4" /> Seleccionar fichero
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contenido *</label>
                    <textarea
                      required
                      value={kForm.content}
                      onChange={(e) => setKForm({ ...kForm, content: e.target.value })}
                      placeholder="Pega aquí el contenido del documento o sube un fichero..."
                      rows={8}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{kForm.content.length.toLocaleString()} caracteres</p>
                  </div>

                  {kStatus === "error" && <div className="flex items-center gap-1.5 text-red-600 text-xs"><XCircle className="w-4 h-4" />{kError}</div>}

                  <button type="submit" disabled={kStatus === "loading"} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />{kStatus === "loading" ? "Guardando..." : "Añadir al conocimiento"}
                  </button>
                </form>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 font-medium mb-1">¿Cómo funciona?</p>
                <p className="text-xs text-blue-600">Los documentos activos se incluyen automáticamente en el contexto de la IA. Desactiva los que no sean relevantes para optimizar el coste.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB AUDITORÍA ── */}
        {tab === "logs" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Registro de auditoría</h2>
              <p className="text-xs text-gray-500 mt-0.5">Últimas 100 acciones con consumo de tokens</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Acción</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Usuario</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Tokens entrada</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Tokens salida</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Caché</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Cuándo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTION_COLORS[log.action] || "bg-gray-400"}`} />
                          <span className="text-gray-700">{ACTION_LABELS[log.action] || log.action}</span>
                          {log.action === "message_blocked" && log.metadata?.reason != null && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{String(log.metadata.reason)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-700 text-xs font-medium">{log.users?.name || "—"}</p>
                          <p className="text-gray-400 text-xs">{log.users?.email || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs font-mono">
                        {log.input_tokens ? log.input_tokens.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs font-mono">
                        {log.output_tokens ? log.output_tokens.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.cache_read_tokens ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-mono">
                            {log.cache_read_tokens.toLocaleString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400 text-xs">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
