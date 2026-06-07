"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "IA Corporativa";

const ERROR_MESSAGES: Record<string, string> = {
  token_missing: "El enlace de acceso no es válido.",
  token_invalid: "El enlace ha caducado o ya fue usado. Solicita uno nuevo.",
  access_denied: "Tu cuenta no tiene acceso. Contacta con el administrador.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {errorParam && ERROR_MESSAGES[errorParam] && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{ERROR_MESSAGES[errorParam]}</span>
        </div>
      )}

      {status === "sent" ? (
        <div className="text-center py-4">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            ¡Enlace enviado!
          </h2>
          <p className="text-gray-500 text-sm">
            Hemos enviado un enlace de acceso a{" "}
            <span className="font-medium text-gray-700">{email}</span>.
            Revisa tu bandeja de entrada (y la carpeta de spam).
          </p>
          <p className="text-gray-400 text-xs mt-3">
            El enlace caduca en 15 minutos.
          </p>
          <button
            onClick={() => {
              setStatus("idle");
              setEmail("");
            }}
            className="mt-6 text-brand-600 text-sm hover:underline"
          >
            Volver a intentar
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Acceder</h2>
          <p className="text-gray-500 text-sm mb-6">
            Introduce tu email corporativo y te enviaremos un enlace de acceso.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm">
                Ha ocurrido un error. Inténtalo de nuevo.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              {status === "loading" ? (
                <span className="animate-pulse">Enviando...</span>
              ) : (
                <>
                  Enviar enlace de acceso
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Bot className="w-9 h-9 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">{companyName}</h1>
          <p className="text-blue-200 mt-1 text-sm">Asistente de IA corporativo</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl shadow-xl p-8 text-center text-gray-400">Cargando...</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-blue-200 text-xs mt-6">
          Sistema de uso exclusivo corporativo · Cumple con el RGPD
        </p>
      </div>
    </div>
  );
}
