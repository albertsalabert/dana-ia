import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAudit, hashPassword } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let adminSession: Awaited<ReturnType<typeof requireAdmin>>;

  try {
    adminSession = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { email, name, password, role = "user" } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const db = getServiceClient();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
  }

  const password_hash = await hashPassword(password);

  const { data: newUser, error } = await db
    .from("users")
    .insert({
      email: normalizedEmail,
      name: name || null,
      role: role === "admin" ? "admin" : "user",
      active: true,
      password_hash,
    })
    .select("id")
    .single();

  if (error || !newUser) {
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }

  await logAudit(adminSession.userId, "user_created", {
    created_email: normalizedEmail,
    created_role: role,
  });

  return NextResponse.json({ ok: true, userId: newUser.id });
}
