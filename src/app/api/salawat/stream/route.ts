import { NextRequest } from "next/server";
import { sseBroadcaster } from "@/lib/server/sse-broadcaster";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const lastEventIdHeader = req.headers.get("last-event-id");
  const sinceParam = req.nextUrl.searchParams.get("since");
  const rawLastSeq = lastEventIdHeader ?? sinceParam;
  const lastSeq = rawLastSeq ? parseInt(rawLastSeq, 10) : NaN;

  const stream = new ReadableStream({
    start(controller) {
      const currentSeq = sseBroadcaster.getCurrentSeq();

      // Send initial connection event with current seq as ID, plus a retry
      // hint so the browser reconnects natively (replaying via Last-Event-ID)
      // instead of needing a client-side reconnect timer for transient drops.
      controller.enqueue(
        encoder.encode(
          `retry: 5000\nid: ${currentSeq}\nevent: connected\ndata: ${JSON.stringify({ status: "ok", seq: currentSeq, time: Date.now() })}\n\n`
        )
      );

      // If reconnecting with a valid sequence number, replay missed events
      if (!isNaN(lastSeq)) {
        const { canReplay, events } = sseBroadcaster.getEventsSince(lastSeq);
        if (canReplay) {
          for (const ev of events) {
            controller.enqueue(
              encoder.encode(`id: ${ev.id}\nevent: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`)
            );
          }
        }
      }

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

      // Subscribe to broadcaster with id
      unsubscribe = sseBroadcaster.subscribe((event, data, id) => {
        if (req.signal.aborted || isClosed) {
          cleanup();
          return;
        }
        controller.enqueue(
          encoder.encode(`${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
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
