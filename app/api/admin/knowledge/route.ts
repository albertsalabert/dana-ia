import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const db = getServiceClient();
  const { data } = await db
    .from("knowledge_base")
    .select("id, title, content, file_type, active, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ entries: data || [] });
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { title, content, file_type } = await req.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Título y contenido requeridos" }, { status: 400 });
  }
  const db = getServiceClient();
  const { data, error } = await db
    .from("knowledge_base")
    .insert({ title: title.trim(), content: content.trim(), file_type: file_type || "text" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id, active, title, content } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (typeof active === "boolean") updates.active = active;
  if (title) updates.title = title;
  if (content) updates.content = content;
  const db = getServiceClient();
  await db.from("knowledge_base").update(updates).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  const db = getServiceClient();
  await db.from("knowledge_base").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
