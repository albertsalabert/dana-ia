import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import AdminPanel from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/chat");
  }

  const db = getServiceClient();
  const { data: users } = await db
    .from("users")
    .select("id, email, name, role, active, created_at, last_seen_at")
    .order("created_at", { ascending: false });

  const { data: recentLogs } = await db
    .from("audit_logs")
    .select("id, user_id, action, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return <AdminPanel users={users || []} logs={recentLogs || []} />;
}
