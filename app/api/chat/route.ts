import { NextRequest, NextResponse } from "next/server";
import { anthropic, CORPORATE_SYSTEM_PROMPT } from "@/lib/anthropic";
import { filterContent, FILTER_MESSAGES } from "@/lib/content-filter";
import { requireSession, logAudit } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const maxDuration = 60;

function generateTitle(text: string): string {
  return text.length > 60 ? text.slice(0, 57).trimEnd() + "..." : text;
}

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let messages: ChatMessage[];
  let conversationId: string | null;

  try {
    const body = await req.json();
    messages = body.messages;
    conversationId = body.conversationId || null;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  // Filtrar el último mensaje del usuario
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

  if (lastUserMessage) {
    const filterResult = filterContent(lastUserMessage.content);
    if (!filterResult.allowed) {
      await logAudit(session.userId, "message_blocked", {
        reason: filterResult.reason,
        message_length: lastUserMessage.content.length,
      });
      return NextResponse.json(
        { blocked: true, message: FILTER_MESSAGES[filterResult.reason] },
        { status: 200 }
      );
    }
  }

  const db = getServiceClient();

  // Crear conversación si es el primer mensaje
  const isFirstMessage = messages.length === 1 && messages[0].role === "user";
  if (isFirstMessage && !conversationId) {
    const title = generateTitle(messages[0].content);
    const { data: conv } = await db
      .from("conversations")
      .insert({ user_id: session.userId, title })
      .select("id")
      .single();
    conversationId = conv?.id || null;
  }

  // Guardar mensaje del usuario
  if (conversationId && lastUserMessage && isFirstMessage) {
    await db.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: lastUserMessage.content,
    });
  } else if (conversationId && lastUserMessage) {
    await db.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: lastUserMessage.content,
    });
  }

  await logAudit(session.userId, "message_sent", { message_count: messages.length });

  // Streaming con acumulación para guardar respuesta
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: CORPORATE_SYSTEM_PROMPT,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          fullResponse += chunk.delta.text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
          );
        }
      }

      // Guardar respuesta del asistente y actualizar timestamp conversación
      if (conversationId && fullResponse) {
        await db.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullResponse,
        });
        await db
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ done: true, conversationId })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
