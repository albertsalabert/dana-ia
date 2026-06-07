import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createMagicToken } from "@/lib/auth";
import { sendMagicLink } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getServiceClient();

    // Verificar que el usuario existe y está activo
    const { data: user } = await db
      .from("users")
      .select("id, active")
      .eq("email", normalizedEmail)
      .single();

    // Siempre responder igual para evitar enumeración de usuarios
    if (!user || !user.active) {
      return NextResponse.json({
        message: "Si el email está registrado, recibirás un enlace de acceso.",
      });
    }

    const token = await createMagicToken(normalizedEmail);
    await sendMagicLink(normalizedEmail, token);

    // Log de auditoría (sin datos sensibles)
    await db.from("audit_logs").insert({
      user_id: user.id,
      action: "magic_link_sent",
      metadata: { ip: req.headers.get("x-forwarded-for") || "unknown" },
    });

    return NextResponse.json({
      message: "Si el email está registrado, recibirás un enlace de acceso.",
    });
  } catch (err) {
    console.error("send-magic-link error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
