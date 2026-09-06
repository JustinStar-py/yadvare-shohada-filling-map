// Lightweight SSE Broadcaster for real-time community progress updates

type SubscriberCallback = (event: string, data: unknown) => void;

class SseBroadcaster {
  private subscribers: Set<SubscriberCallback> = new Set();

  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  broadcast(event: string, data: unknown): void {
    // Iterate a snapshot so removing dead subscribers during the loop is safe
    for (const callback of [...this.subscribers]) {
      try {
        callback(event, data);
      } catch {
        // Client is gone — drop the subscriber to prevent a memory leak
        this.subscribers.delete(callback);
      }
    }
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

export const sseBroadcaster = globalForBroadcaster.sseBroadcaster ?? new SseBroadcaster();

globalForBroadcaster.sseBroadcaster = sseBroadcaster;
