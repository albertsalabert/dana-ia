import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from("users")
    .select("id, email, name, role, active, created_at, last_seen_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, active, role } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof active === "boolean") updates.active = active;
  if (role === "admin" || role === "user") updates.role = role;

  const db = getServiceClient();
  const { error } = await db.from("users").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
