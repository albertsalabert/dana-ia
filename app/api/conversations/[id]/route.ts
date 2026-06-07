import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const db = getServiceClient();

  // Verificar que la conversación pertenece al usuario
  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { data: messages } = await db
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages || [] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const db = getServiceClient();

  await db
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  return NextResponse.json({ ok: true });
}
