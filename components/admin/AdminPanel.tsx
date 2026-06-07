"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Activity,
  ChevronLeft,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Bot,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, AuditLog } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  users: AppUser[];
  logs: AuditLog[];
}

const ACTION_LABELS: Record<string, string> = {
  login: "Inicio de sesión",
  message_sent: "Mensaje enviado",
  message_blocked: "Mensaje bloqueado",
  user_created: "Usuario creado",
};

export default function AdminPanel({ users: initialUsers, logs }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [tab, setTab] = useState<"users" | "logs">("users");
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" });
  const [showPassword, setShowPassword] = useState(false);
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [createError, setCreateError] = useState("");
  const router = useRouter();

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
      setTimeout(() => {
        setCreateStatus("idle");
        router.refresh();
      }, 2000);
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
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, active: !currentActive } : u))
      );
    }
  }

  const activeUsers = users.filter((u) => u.active).length;
  const blockedMessages = logs.filter((l) => l.action === "message_blocked").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-1.5 text-blue-300 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al chat
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <Bot className="w-5 h-5 text-blue-300" />
          <span className="font-semibold">Panel de Administración</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-brand-600" />
              <div>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                <p className="text-sm text-gray-500">Usuarios totales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-gray-800">{activeUsers}</p>
                <p className="text-sm text-gray-500">Usuarios activos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-gray-800">{blockedMessages}</p>
                <p className="text-sm text-gray-500">Mensajes bloqueados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "users" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "logs" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Activity className="w-4 h-4" />
            Auditoría
          </button>
        </div>

        {tab === "users" && (
          <div className="grid grid-cols-3 gap-6">
            {/* Lista */}
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
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role}
                    </span>
                    <button
                      onClick={() => toggleUserActive(user.id, user.active)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={user.active ? "Desactivar" : "Activar"}
                    >
                      {user.active ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-300" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Crear usuario */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h2 className="font-semibold text-gray-800">Crear usuario</h2>
              </div>

              {createStatus === "ok" ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  Usuario creado correctamente
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="usuario@empresa.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nombre Apellido"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  {createStatus === "error" && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs">
                      <XCircle className="w-4 h-4" />
                      {createError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createStatus === "loading"}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    {createStatus === "loading" ? "Creando..." : "Crear usuario"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Registro de auditoría (últimas 50 acciones)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Datos anonimizados — sin contenido de conversaciones</p>
            </div>
            <div className="divide-y divide-gray-50">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      log.action === "message_blocked" ? "bg-amber-400" : log.action === "login" ? "bg-green-400" : "bg-blue-400"
                    }`}
                  />
                  <span className="text-sm text-gray-600 flex-1">{ACTION_LABELS[log.action] || log.action}</span>
                  {log.action === "message_blocked" && log.metadata?.reason != null && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      {String(log.metadata.reason)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
