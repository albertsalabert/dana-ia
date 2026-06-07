import { NextRequest, NextResponse } from "next/server";
import { anthropic, CORPORATE_SYSTEM_PROMPT } from "@/lib/anthropic";
import { filterContent, FILTER_MESSAGES } from "@/lib/content-filter";
import { requireSession, logAudit } from "@/lib/auth";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSession>>;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Mensajes inválidos");
    }
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  // Filtrar el último mensaje del usuario antes de enviarlo a Claude
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

  // Llamada a Claude con streaming
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: CORPORATE_SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Log de auditoría (solo metadata, sin contenido)
  await logAudit(session.userId, "message_sent", {
    message_count: messages.length,
  });

  // Devolver stream al cliente
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
          );
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
