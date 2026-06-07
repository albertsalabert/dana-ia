"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Activity,
  ChevronLeft,
  Mail,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Bot,
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
  magic_link_sent: "Enlace enviado",
  login: "Inicio de sesión",
  message_sent: "Mensaje enviado",
  message_blocked: "Mensaje bloqueado",
  user_invited: "Usuario invitado",
};

export default function AdminPanel({ users: initialUsers, logs }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [tab, setTab] = useState<"users" | "logs">("users");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [inviteError, setInviteError] = useState("");
  const router = useRouter();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteStatus("loading");
    setInviteError("");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setInviteStatus("ok");
      setInviteEmail("");
      setInviteName("");
      setInviteRole("user");
      setTimeout(() => {
        setInviteStatus("idle");
        router.refresh();
      }, 2000);
    } else {
      setInviteStatus("error");
      setInviteError(data.error || "Error al invitar");
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
        prev.map((u) =>
          u.id === userId ? { ...u, active: !currentActive } : u
        )
      );
    }
  }

  const activeUsers = users.filter((u) => u.active).length;
  const blockedMessages = logs.filter(
    (l) => l.action === "message_blocked"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <p className="text-2xl font-bold text-gray-800">
                  {users.length}
                </p>
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
                <p className="text-2xl font-bold text-gray-800">
                  {blockedMessages}
                </p>
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
              tab === "users"
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "logs"
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Activity className="w-4 h-4" />
            Auditoría
          </button>
        </div>

        {tab === "users" && (
          <div className="grid grid-cols-3 gap-6">
            {/* Lista de usuarios */}
            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">
                  Usuarios registrados
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium flex-shrink-0">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user.name || "—"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
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

            {/* Formulario invitar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h2 className="font-semibold text-gray-800">Invitar usuario</h2>
              </div>

              {inviteStatus === "ok" ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  Invitación enviada correctamente
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Email corporativo *
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nombre (opcional)
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Nombre Apellido"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Rol
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "user" | "admin")
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  {inviteStatus === "error" && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs">
                      <XCircle className="w-4 h-4" />
                      {inviteError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={inviteStatus === "loading"}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {inviteStatus === "loading" ? "Enviando..." : "Enviar invitación"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                Registro de auditoría (últimas 50 acciones)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Datos anonimizados — sin contenido de conversaciones
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      log.action === "message_blocked"
                        ? "bg-amber-400"
                        : log.action === "login"
                          ? "bg-green-400"
                          : "bg-blue-400"
                    }`}
                  />
                  <span className="text-sm text-gray-600 flex-1">
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  {log.action === "message_blocked" && log.metadata?.reason != null && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      {String(log.metadata.reason)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
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
