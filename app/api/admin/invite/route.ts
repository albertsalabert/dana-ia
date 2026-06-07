import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { sendMagicLink } from "@/lib/mailer";
import { createMagicToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let adminSession: Awaited<ReturnType<typeof requireAdmin>>;

  try {
    adminSession = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { email, name, role = "user" } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const db = getServiceClient();

  // Comprobar si ya existe
  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Este email ya está registrado" },
      { status: 409 }
    );
  }

  // Crear usuario
  const { data: newUser, error } = await db
    .from("users")
    .insert({
      email: normalizedEmail,
      name: name || null,
      role: role === "admin" ? "admin" : "user",
      active: true,
    })
    .select("id")
    .single();

  if (error || !newUser) {
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }

  // Enviar magic link de bienvenida
  const token = await createMagicToken(normalizedEmail);
  await sendMagicLink(normalizedEmail, token);

  await logAudit(adminSession.userId, "user_invited", {
    invited_email: normalizedEmail,
    invited_role: role,
  });

  return NextResponse.json({ ok: true, userId: newUser.id });
}
