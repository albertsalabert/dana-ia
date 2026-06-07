import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import ChatInterface from "@/components/chat/ChatInterface";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const db = getServiceClient();
  const { data: user } = await db
    .from("users")
    .select("name, email, role")
    .eq("id", session.userId)
    .single();

  return (
    <ChatInterface
      user={{
        name: user?.name || user?.email || "Usuario",
        email: user?.email || "",
        role: user?.role || "user",
      }}
    />
  );
}
