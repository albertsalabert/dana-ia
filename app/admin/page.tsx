import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import AdminPanel, { type AdminLog } from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  try { await requireAdmin(); } catch { redirect("/chat"); }

  const db = getServiceClient();

  const [{ data: users }, { data: logs }, { data: knowledge }] = await Promise.all([
    db.from("users").select("id, email, name, role, active, created_at, last_seen_at").order("created_at", { ascending: false }),
    db
      .from("audit_logs")
      .select("id, user_id, action, metadata, created_at, input_tokens, output_tokens, cache_read_tokens, users!inner(email, name)")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("knowledge_base").select("id, title, content, file_type, active, created_at").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminPanel
      users={users || []}
      logs={(logs as unknown as AdminLog[]) || []}
      knowledge={knowledge || []}
    />
  );
}
