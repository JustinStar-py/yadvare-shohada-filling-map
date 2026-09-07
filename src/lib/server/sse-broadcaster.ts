// Lightweight SSE Broadcaster for real-time community progress updates

type SubscriberCallback = (event: string, data: unknown, id?: number) => void;

interface QueuedEvent {
  id: number;
  event: string;
  data: unknown;
  timestamp: number;
}

class SseBroadcaster {
  private subscribers: Set<SubscriberCallback> = new Set();
  private seq: number = 0;
  private history: QueuedEvent[] = [];
  private readonly MAX_HISTORY = 100;

  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  broadcast(event: string, data: unknown): number {
    const eventId = ++this.seq;

    // Buffer in ring buffer for reconnect replay
    this.history.push({
      id: eventId,
      event,
      data,
      timestamp: Date.now(),
    });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Iterate a snapshot so removing dead subscribers during the loop is safe
    for (const callback of [...this.subscribers]) {
      try {
        callback(event, data, eventId);
      } catch {
        // Client is gone — drop the subscriber to prevent a memory leak
        this.subscribers.delete(callback);
      }
    }

    return eventId;
  }

  getCurrentSeq(): number {
    return this.seq;
  }

  getEventsSince(lastSeq: number): { canReplay: boolean; events: QueuedEvent[] } {
    if (lastSeq >= this.seq) {
      return { canReplay: true, events: [] };
    }
    if (this.history.length === 0) {
      return { canReplay: true, events: [] };
    }

    const oldestAvailableSeq = this.history[0].id;
    // If client is asking for something older than our buffer window, cannot replay faithfully
    if (lastSeq < oldestAvailableSeq - 1) {
      return { canReplay: false, events: [] };
    }

    const missed = this.history.filter((e) => e.id > lastSeq);
    return { canReplay: true, events: missed };
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global singleton instance — must ALWAYS be cached on globalThis, otherwise
// production module instances diverge and subscribers never receive events.
const globalForBroadcaster = globalThis as unknown as {
  sseBroadcaster?: SseBroadcaster;
};

if (!globalForBroadcaster.sseBroadcaster || typeof globalForBroadcaster.sseBroadcaster.getCurrentSeq !== "function") {
  globalForBroadcaster.sseBroadcaster = new SseBroadcaster();
}

export const sseBroadcaster = globalForBroadcaster.sseBroadcaster;
