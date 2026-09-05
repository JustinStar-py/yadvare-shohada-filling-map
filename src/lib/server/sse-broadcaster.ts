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
    for (const callback of this.subscribers) {
      try {
        callback(event, data);
      } catch (err) {
        console.error("Error broadcasting to SSE subscriber:", err);
      }
    }
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global singleton instance
const globalForBroadcaster = globalThis as unknown as {
  sseBroadcaster?: SseBroadcaster;
};

export const sseBroadcaster = globalForBroadcaster.sseBroadcaster ?? new SseBroadcaster();

if (process.env.NODE_ENV !== "production") {
  globalForBroadcaster.sseBroadcaster = sseBroadcaster;
}
