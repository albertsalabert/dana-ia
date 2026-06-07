import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Error BD" }, { status: 500 });

  return NextResponse.json({ conversations: data });
}
