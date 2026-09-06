import { NextRequest } from "next/server";
import { sseBroadcaster } from "@/lib/server/sse-broadcaster";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "ok", time: Date.now() })}\n\n`)
      );

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 20000);

      let unsubscribe = () => {};
      let isClosed = false;

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      // Subscribe to broadcaster
      unsubscribe = sseBroadcaster.subscribe((event, data) => {
        if (req.signal.aborted || isClosed) {
          cleanup();
          return;
        }
        // Let enqueue errors bubble so the broadcaster drops this dead subscriber
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      });

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
