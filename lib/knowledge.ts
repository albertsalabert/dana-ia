import { getServiceClient } from "./supabase";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  file_type: string;
  active: boolean;
  created_at: string;
}

export async function getActiveKnowledge(): Promise<KnowledgeEntry[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("knowledge_base")
    .select("id, title, content, file_type, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: true });
  return data || [];
}

export function buildKnowledgeBlock(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";
  const docs = entries
    .map((e) => `### ${e.title}\n\n${e.content}`)
    .join("\n\n---\n\n");
  return `\n\n## BASE DE CONOCIMIENTO CORPORATIVO\n\nUtiliza la siguiente información interna de la empresa para responder con precisión cuando sea relevante:\n\n${docs}`;
}
