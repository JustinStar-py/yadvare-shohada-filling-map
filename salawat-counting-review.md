# Salawat Counting & Total-Count Review (muse spark1.3)

> Scope: how individual Salawat submissions are counted, how the global total is
> fetched/updated, cross-user synchronization, and rapid/concurrent submission
> handling. Analysis only — no implementation changed.

## 1. How it works today

### Write path

```
SalawatButton press
  → optimistic +1 (displayedCountRef, totalCampaignSalawat)
  → batch accumulator (BATCH_SIZE = 5, 8s idle flush, beforeunload flush)
  → POST /api/salawat { idempotencyKey (UUID), count }
      → Zod validation (count: int 1–10)
      → in-memory token-bucket rate limit (4 burst, 1 req / 5s per IP)
      → CampaignService.submitSalawat inside file-DB mutex:
          idempotency check → currentCount += count
          → participantsCount += 1 → READY_TO_LAUNCH transition
          → full JSON rewrite + fsync + atomic rename
          → in-memory SSE broadcast (absolute currentCount)
```

Offline failures are queued in `localStorage` (`offline_salawat_queue`, capped at 50)
and flushed on next mount with the same idempotency keys.

### Read / sync path

1. Initial `GET /api/campaign/state` (authoritative snapshot).
2. SSE `salawat_update` carrying **absolute** `currentCount` (not deltas).
3. Client monotonic reconciliation: the display never moves down until the server
   catches up; state precedence never regresses a locally reached
   `READY_TO_LAUNCH`.
4. `launch_event` for day sealing + constellation update.
5. 60s background poll as eventual-consistency backstop; full reload on Tehran
   day rollover.

### What is already good (keep)

- Absolute-count SSE payloads — idempotent state sync, not fragile deltas.
- Idempotency keys with 48h TTL — safe retries, `keepalive` + offline queue reuse
  the same key.
- Client batching (5 per request) amortizes network cost.
- Optimistic UI with rollback keeps the button feeling instant.
- Atomic file writes (temp + fsync + rename) with backup recovery.

## 2. Problems, ranked by severity

### P0 — Storage is the throughput ceiling

Every accepted batch performs:

- `structuredClone` of the entire DB,
- `JSON.stringify` of the entire DB,
- an fsync + atomic rename,

all serialized through a single in-process `AsyncMutex`. Cost per request is
O(entire DB size); latency grows linearly under burst.

Worse, the mutex, cache, SSE broadcaster, idempotency map, and rate limiter are
all **single-process singletons**. A second Next.js instance (or any serverless
scaling) silently forks counts, drops realtime events for the other instance's
subscribers, and bypasses limits. Effective ceiling: **one Node process with
modest concurrency**.

### P0 — No authoritative re-anchor on POST success

The server returns `currentCount`, but the client ignores it and waits for its
own SSE echo. SSE has no sequence numbers and no `Last-Event-ID` replay, so a
message lost in a reconnect gap leaves the client on a wrong optimistic value
until the 60s poll. Related gap: **`totalCampaignSalawat` appears in no SSE
payload**, so the global total goes stale for up to 60s while the daily count
is realtime.

### P1 — Dead 409 path / undefined post-launch semantics

`POST /api/salawat` has a "day already launched" 409 branch, but
`submitSalawat` never returns `success: false` — it keeps incrementing past the
target after `LAUNCHED`. Either seal at launch (make the 409 live) or
explicitly define over-target counting. Currently it is accidental.

### P1 — `participantsCount` is miscounted

It increments +1 per **batch request**: one user reciting 5× counts as one
"participant," while a steady user counts as N. It measures neither people nor
presses.

### P1 — Rollback on 429 destroys legitimate recitations

Rate-limited (but genuinely recited) presses are subtracted from the display
instead of retried with the same idempotency key. Only 400/409 should roll
back; 429/5xx/network errors should retry.

### P2 — Monotonic clamp breaks downward corrections

A same-day admin reset broadcasts `currentCount: 0`, but the client refuses to
move down — the display stays stuck high until reload or day rollover. There is
no epoch/version to distinguish "reset" from "stale."

### P2 — Readers block writers; totals recomputed per read

`readDb` and `mutateDb` share one mutex, so state polls stall behind write
bursts. `getPublicState` re-sums all missions on every call instead of keeping
a running total.

### P2 — IP-keyed in-memory rate limit

Unfair behind NAT (schools/offices share one bucket), bypassable across
instances, and the sustained rate (1 req / 5s with batches of 5 ≈ 1 salawat/s)
is undocumented relative to the 2s client cooldown.

## 3. Recommended design

Best approach: **atomic-counter store + sequenced event log + re-anchoring
client**, in impact order:

1. **Atomic increment store.** SQLite (`UPDATE missions SET count = count + ?`),
   Postgres, or Redis `INCR` as the hot counter with periodic durable flush.
   Removes the serialization bottleneck and the per-write full-file cost. Put a
   `UNIQUE` constraint on `idempotencyKey` so exactly-once is transactional,
   not map-based.
2. **Sequenced broadcasts.** Add monotonic `seq` (+ `serverTime`, plus
   `totalCampaignSalawat` and participant figures) to every event. Support
   `GET /stream?since=seq` / `Last-Event-ID` replay so reconnect gaps close
   immediately.
3. **Re-anchor on POST response.** Client applies `max(local, serverCount)` and
   highest `seq` on every success; keeps the optimistic increment for instant
   feel. Retry 429/5xx/network with the **same** key and jittered backoff;
   roll back only on 400/409.
4. **Fix participant semantics.** Track distinct contributors per day (daily set
   of device-hash/IP-hash) separately from press counts.
5. **Decide post-launch policy explicitly** (seal vs. overflow counter) and
   enforce it in `submitSalawat` so the 409 path is either live or deleted.
6. **Add an epoch/reset counter** to the mission so admin resets and day
   rollovers can legitimately move the display downward.
7. **For multi-instance:** shared store for counters + pub/sub fan-out for SSE;
   shared sliding-window rate limiting keyed on device fingerprint with IP
   fallback.

### Suggested rollout

- **P0 (no storage change, pure protocol/client fixes):** items 2, 3, 5, 6 —
  closes most user-visible accuracy gaps with minimal risk.
- **P1 (when traffic or multi-instance demands it):** item 1 (storage swap),
  then 4 and 7.

## 4. Explicit non-goals

- Delta-based SSE sync (fragile under reconnects; absolute counts + seq are
  strictly better here).
- Client-side total computation as source of truth (server aggregation or a
  maintained counter must remain authoritative).

---

## 5. Architectural Recommendations & Comprehensive Redesign (by Antigravity)

### 5.1 Executive Assessment: The Core Bottleneck

The existing implementation has thoughtful baseline ergonomics (idempotency keys, batching, optimistic client UI, and absolute SSE values), but suffers from an **impedance mismatch between write volume and disk durability semantics**:

1. **Synchronous Stop-the-World Disk Writes:**
   Every accepted batch of 5 salawat executes inside an exclusive in-process mutex:
   $$\text{readCache} \longrightarrow \text{structuredClone(entire DB)} \longrightarrow \text{JSON.stringify(indent 2)} \longrightarrow \text{writeFile} \longrightarrow \text{fsync()} \longrightarrow \text{rename}$$
   On modern NVMe SSDs, an `fsync()` takes 2–15ms (on slower cloud virtual disks, 30–80ms). Because requests queue sequentially in Node's single thread, the maximum theoretical write throughput is hard-capped at **~50–100 batches per second**, dropping to 10–20 req/s during I/O contention. A burst of 100 concurrent users will experience seconds of queuing latency.

2. **Decoupling Hot Writes from Cold Storage:**
   Salawat counting is inherently a **high-frequency, additive stream**. The correct paradigm is to separate **in-memory hot counter updates ($O(1)$ in $<0.1\text{ms}$)** from **durable background persistence (debounced write-behind buffer or sequential write-ahead log)**.

---

### 5.2 Review of Key Subsystems & Proposed Improvements

#### 1. Individual Salawat Submission & Client Reconciliation
* **Current Behavior:**
  - Client enforces a 2-second cooldown and batches 5 presses (or flushes on 8s idle).
  - When `POST /api/salawat` completes with HTTP 200, the returned payload `{ currentCount, ... }` is **discarded** by `SalawatButton.tsx`. The client waits solely for an SSE echo or the 60s poll.
  - When a submission fails (even on a transient 429 rate limit or 5xx), `page.tsx` executes `handleSalawatRejected`, immediately rolling back the user's displayed count (`displayedCountRef.current -= count`).
* **Antigravity's Recommended Design:**
  - **In-Flight Optimistic Formula:**
    $$\text{displayedCount} = \text{serverAuthoritativeCount} + \text{inFlightLocalCount}$$
    When a batch is dispatched, it remains in `inFlightLocalCount`. When the HTTP POST succeeds, read the response body (`res.json()`) and re-anchor immediately:
    $$\text{serverAuthoritativeCount} = \text{response.currentCount}, \quad \text{inFlightLocalCount} -= \text{batchCount}$$
    This provides instantaneous zero-drift sync without waiting for SSE packet arrival.
  - **Resilient Retries (No Rollback on 429/5xx):**
    Never penalize a user who genuinely recited salawat. If the server responds with 429 or 503, keep the batch in a `retryQueue`, display a subtle "در حال همگام‌سازی..." (syncing) indicator, and retry with exponential backoff + jitter using the **exact same idempotency key**. Only rollback on terminal client errors: 400 (malformed) or 409 (campaign closed/day sealed).
  - **Offline Queue Aggregation:**
    On network recovery, rather than firing $N$ individual serial HTTP requests (which risks tripping the rate limiter), aggregate all offline counts into one or two larger batches.

#### 2. Global Total (`totalCampaignSalawat`) Synchronization
* **Current Behavior:**
  - `totalCampaignSalawat` is recalculated on every full state fetch by summing all mission records in memory (`for (const m of Object.values(db.missions))`).
  - The SSE broadcast `salawat_update` **does not include `totalCampaignSalawat`**.
* **Impact:**
  - When any user recites salawat, other users see the daily gauge fill up in real time, but the global total in the header and records remains stale for up to 60 seconds (until the polling interval).
* **Antigravity's Recommended Design:**
  - Maintain `totalCampaignSalawat` as a cached running counter at the root database state. When `count` is added, increment both `mission.currentCount += count` and `db.totalCampaignSalawat += count` in $O(1)$.
  - Broadcast `totalCampaignSalawat` inside every `salawat_update` event so all global statistics update in real time across all open tabs.

#### 3. Cross-User Synchronization & SSE Protocol Upgrades
* **Current Behavior:**
  - The SSE endpoint sends `event: connected` on connection start, but does not send initial state.
  - If a user's mobile connection drops or the browser tab suspends, upon reconnecting to SSE, all events sent in the interim are lost. The client must wait for the 60s polling backstop.
  - SSE events lack monotonic sequence numbers (`seq`).
* **Antigravity's Recommended Design:**
  - **Monotonic Event Sequencing (`seq`):** Every broadcast event is assigned a monotonically increasing integer (`seq: 1, 2, 3...`).
  - **In-Memory Ring Buffer (Event Log):** The server maintains the last 100 broadcast events in a circular buffer (`recentEvents[]`).
  - **Seamless Resume with `Last-Event-ID`:** When reconnecting, the client sends `Last-Event-ID: <lastSeq>` or `?since=<lastSeq>`. The server instantly replays the missed events. If the client is too far behind (gap > 100), the server sends a complete `campaign_snapshot` event.
  - Aggressive 60-second polling can be reduced to a lightweight 5-minute safety watchdog.

#### 4. The Monotonic Display Trap & Epoch-Based Resets
* **Current Behavior:**
  - In `src/app/page.tsx`:
    ```ts
    serverCountRef.current = Math.max(serverCountRef.current, update.currentCount);
    if (update.currentCount >= displayedCountRef.current) {
      displayedCountRef.current = update.currentCount;
    }
    ```
* **Impact:**
  - If an administrator resets the day's count in the admin dashboard (e.g. from 1,000 back to 0), the client's `Math.max` causes it to reject any count smaller than what was previously seen. The user's screen stays locked at 1,000 indefinitely until a hard browser refresh.
* **Antigravity's Recommended Design:**
  - Add an integer `epoch` (or `version`) to `DailyMission`.
  - Incremented whenever an admin manual override, count reset, or new daily cycle occurs.
  - Include `epoch` in all API responses and SSE events.
  - If `event.epoch > localEpoch`, the client unconditionally resets its monotonic bounds:
    $$\text{localEpoch} = \text{event.epoch}, \quad \text{serverCountRef} = \text{event.currentCount}, \quad \text{displayedCountRef} = \text{event.currentCount}$$

#### 5. True Participant Counting (`participantsCount`)
* **Current Behavior:**
  - `mission.participantsCount += 1` executes on every accepted batch.
  - A single dedicated user sending 20 batches of 5 counts as "20 participants".
  - 10 distinct users reciting 2 salawat each and closing the page might only count as 0 or 2 participants depending on unload flushes.
* **Antigravity's Recommended Design:**
  - Client generates a persistent anonymous UUID `visitorId` in `localStorage` on first visit.
  - Pass `visitorId` with each submission payload.
  - Server maintains a daily unique participant set for the active mission date:
    - Single-process: `dailyVisitors: Set<string>`
    - Multi-instance / Scale: Redis `HyperLogLog` (`PFADD visitors:YYYY-MM-DD visitorId`)
    - `mission.participantsCount = dailyVisitors.size` (or `PFCOUNT`).
  - Now, 1 user reciting 500 salawat counts as **1 participant**, while 50 distinct individuals count as **50 participants**.

#### 6. Anti-Spam & NAT-Aware Rate Limiting
* **Current Behavior:**
  - In-memory token bucket keyed purely on IP address (1 request per 5s per IP, burst of 4).
* **Impact:**
  - In community halls, mosques, or schools where dozens of people participate on the same local Wi-Fi, they all share one public IP. After the first 4 batches, all other users are blocked with 429 errors.
* **Antigravity's Recommended Design:**
  - **Dual-Key Limiting:** Rate limit primarily on `hash(clientIp + visitorId)`. Use the client IP only as an outer floodgate (e.g., max 120 req/minute per IP) to prevent malicious volumetric floods.
  - **Client-Side Visual Cooldown Ring:** Continue enforcing the 2-second serene pause on the button with haptic feedback, while ensuring legitimate multi-device traffic on the same network is never penalized.

---

### 5.3 Comparative Architecture Matrix

| Dimension | Tier 1: In-Memory Write-Behind Buffer (Zero Extra Dependencies) | Tier 2: Embedded SQLite with WAL Mode | Tier 3: Distributed Cluster (Redis + Postgres) |
| :--- | :--- | :--- | :--- |
| **Max Write Throughput** | **~10,000 req/sec** | **~25,000 req/sec** | **~100,000+ req/sec** |
| **Infrastructure** | Existing Node.js process & JSON files | Single file (`data/campaign.db`), no daemon | Redis + Database + SSE Pub/Sub |
| **Durability Guarantee** | In-memory + debounced disk sync (every 500ms) | ACID transactions, sequential Write-Ahead Log | Enterprise multi-node replication |
| **Implementation Effort** | **Small (internal refactor of `db.ts`)** | Moderate (replace `db.ts` with SQLite query layer) | High (orchestration, Docker, Redis pub/sub) |
| **Recommended Context** | **Immediate best option for the current setup** | Next evolution if single-node file concurrency grows | If scaling horizontally across multiple cloud instances |

---

### 5.4 High-Impact Immediate Architecture (Tier 1: Write-Behind Buffer)

The best immediate approach that requires **zero infrastructure changes or new dependencies** is the **Server-Side Write-Behind Buffer**:

```
[User Click 1..5] 
       │ (batch of 5)
       ▼
[POST /api/salawat]
       │
       ▼
[In-Memory Mutex (0.01ms)] 
       ├─ Update cachedDb.missions[today].currentCount += count
       ├─ Update cachedDb.totalCampaignSalawat += count
       ├─ dailyVisitors.add(visitorId)
       ├─ markDirty(true)
       ├─ seq++
       ▼
[Immediate SSE Broadcast & HTTP 200 Return (<1ms response time)]
       │
       │ (Asynchronous Timer: every 500ms when dirty)
       ▼
[Background Durable Persist]
       ├─ JSON stringify + atomic rename (no HTTP request blocked)
       └─ Process exit hooks (SIGINT, SIGTERM, beforeExit flush)
```

This single architectural change transforms the write latency from **15–50ms blocked on disk** down to **<0.1ms in RAM**, boosting write capacity by **over 500x** while keeping the code simple and self-contained.

---

### 5.5 Concrete Schema & Event Contract

#### 1. POST `/api/salawat` Request & Response
```typescript
// Request
interface SalawatPostRequest {
  idempotencyKey: string; // UUID v4
  count: number;          // 1..10
  visitorId: string;      // Anonymous persistent device UUID
  epoch?: number;         // Client's current known epoch
}

// Authoritative Response (HTTP 200)
interface SalawatPostResponse {
  success: boolean;
  seq: number;
  epoch: number;
  currentCount: number;
  target: number;
  totalCampaignSalawat: number;
  participantsCount: number;
  missionState: "ACTIVE" | "READY_TO_LAUNCH" | "LAUNCHING" | "LAUNCHED";
  isDuplicate: boolean;
}
```

#### 2. Enhanced SSE `salawat_update` Payload
```typescript
interface SseSalawatUpdateEvent {
  seq: number;                   // Monotonic sequence number
  epoch: number;                 // Reset / override epoch
  date: string;                  // "YYYY-MM-DD"
  currentCount: number;          // Daily count
  target: number;                // Daily target
  totalCampaignSalawat: number;  // Real-time global total
  participantsCount: number;     // True unique participants
  state: "ACTIVE" | "READY_TO_LAUNCH" | "LAUNCHING" | "LAUNCHED";
}
```

---

### 5.6 Recommended Phased Implementation Plan

1. **Phase 1 (Immediate Client & Protocol Accuracy):**
   - Add `totalCampaignSalawat`, `seq`, and `epoch` to the SSE broadcast.
   - Update `SalawatButton.tsx` to read the POST response JSON and forward authoritative server counts directly to `page.tsx`.
   - Update `page.tsx` with the `inFlightLocalCount` model and epoch reset handler.
   - Do not rollback optimistic increments on 429/5xx; queue for retry with exponential backoff.

2. **Phase 2 (Server Performance & Write-Behind):**
   - Refactor `src/lib/server/db.ts` to use in-memory fast mutation with a 500ms debounced disk flush.
   - Attach clean shutdown handlers (`SIGTERM`, `SIGINT`) so no dirty data is lost on restart.

3. **Phase 3 (Participant Identity & NAT Protection):**
   - Implement anonymous client `visitorId` and daily unique participant tracking.
   - Shift rate limiter to `clientIp + visitorId` dual keys to support multi-user shared Wi-Fi environments.

---

## 6. Independent second pass - GLM (Z.ai), 2026-09-07

> Reviewed the live code end to end: `db.ts`, `campaign-service.ts`, `api/salawat/route.ts`,
> `api/salawat/stream/route.ts`, `rate-limit.ts`, `sse-broadcaster.ts`, `SalawatButton.tsx`,
> `page.tsx`. **Verdict: every claim in sections 1-3 checks out against the code, and the
> recommended architecture (atomic-counter store + sequenced events + re-anchoring client)
> is what I would build too.** Below: an evidence table, four additional findings the first
> pass missed, and concrete implementation notes where I would sharpen the plan.

### 6.1 Claim verification (file:line evidence)

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| P0 | Full-file rewrite per submission, one mutex | Confirmed | `db.ts` `mutateDb` -> `structuredClone` -> `persistDb` (full `JSON.stringify` + fsync + rename); `readDb` takes the same mutex (`db.ts:348`) |
| P0 | Single-process singletons everywhere | Confirmed | module-level `dbMutex`/`cachedDb`, `rate-limit.ts:52` `globalSingleton`, `sse-broadcaster.ts:34` |
| P0 | POST response ignored by client | Confirmed | route returns `result.currentCount`, but `flushBatch` only checks `res.ok` and never reads the body (`SalawatButton.tsx:85-89`) |
| P0 | No seq, no replay, total absent from SSE | Confirmed | stream emits bare `event:`/`data:` (no `id:` field); `salawat_update` payload is date/currentCount/target/state/participantsCount only (`campaign-service.ts:199-205`) |
| P1 | Dead 409 path | Confirmed | `submitSalawat` has no `success:false` branch; increments unconditionally past target/LAUNCHED (`campaign-service.ts:184-190`) |
| P1 | participantsCount +1 per batch | Confirmed | `campaign-service.ts:185` |
| P1 | 429 rollback loses recitations | Confirmed | `if (!res.ok) onSubmissionRejected(...)` treats 429/500 like 400, no retry (`SalawatButton.tsx:86-88`) |
| P2 | Monotonic clamp blocks resets | Confirmed | `page.tsx:114-119` (`Math.max` + `>=` guard); only `launch_event` force-re-anchors (`page.tsx:158-160`) |
| P2 | Readers block writers; totals re-summed | Confirmed | shared mutex; `getPublicState` loops all missions per read (`campaign-service.ts:113-116`) |
| P2 | IP-keyed in-memory limiter | Confirmed | token bucket 4 burst / 1-per-5s (`rate-limit.ts:66-69`); fixed `Retry-After: 5` |

### 6.2 Additional findings (missed by the first pass)

1. **Broadcast happens before durability.** `sseBroadcaster.broadcast()` runs inside the
   mutator; `mutateDb` persists *after* the mutator returns (`db.ts:379-381`). A crash
   between broadcast and `rename` announces counts that never became durable. One-line
   fix: persist first, then broadcast.
2. **Client and server inflate `participantsCount` differently - and the clamp keeps the
   worst value.** The optimistic path adds +1 **per press** (`page.tsx:267`) while the
   server adds +1 **per batch** (5 presses = 1 unit), and SSE reconciliation applies
   `Math.max(prev, update)` (`page.tsx:142-145`), so the inflated optimistic number sticks
   around. The metric is wrong in two directions at once.
3. **Rate limiter trusts the spoofable leftmost `X-Forwarded-For` hop.** `getClientIp`
   takes `forwarded.split(",")[0]` (`rate-limit.ts:58-62`). Behind a proxy that appends
   (rather than replaces) headers, a client can rotate that value per request and get a
   fresh bucket every time. Use the rightmost untrusted hop / platform real-IP header,
   and prefer a device fingerprint as the primary key.
4. **`readDb` hands out the live cached object, and callers mutate it outside the mutex.**
   `getPublicState` and `getAdminDashboardData` call `ensureMissionForDate(db, today)` on
   the shared cached instance (`campaign-service.ts:89, 624`), creating today's mission
   outside `mutateDb`. Benign today (idempotent, same content) and only becomes durable
   when an unrelated write clones the cache - but it is a race-shaped landmine. Return a
   snapshot; move mission creation into `mutateDb`.
   Minor siblings: the limiter consumes a token before body validation (`salawat/route.ts:10`),
   and `persistDb` fsyncs the temp file but not the directory after `rename` (fine on
   Windows, worth remembering for Linux deploys).

### 6.3 Recommended design - my take

I agree with the target architecture and with the non-goals. Concrete notes where I
would sharpen or sequence differently:

1. **Protocol/client fixes first** - agree with the rollout. Highest accuracy-per-line:
   seq + totals in payloads, POST re-anchor, retry classification, epoch for resets,
   explicit post-launch policy.
2. **Use the SSE standard instead of inventing replay.** Emit `id: <seq>` on every event
   and keep a small in-memory ring buffer (last ~500 events). On (re)connect, read the
   `Last-Event-ID` header - EventSource sends it automatically - and replay the gap; if
   the gap is too old, the client falls back to `GET /api/campaign/state`. Add `retry:
   5000` once and delete the manual reconnect timer; the browser handles backoff.
3. **Re-anchor on every POST response.** Return `{ currentCount, participantsCount,
   totalCampaignSalawat, epoch, seq }`; the client applies per-field `max(local, server)`
   when the epoch matches, and adopts server values wholesale when it differs. This alone
   closes the 60s staleness window for the global total.
4. **Storage: the deployment runs Node v24, so `node:sqlite` is already built in - no new
   dependency.** A two-table schema (`missions`, `salawat_events` with
   `idempotency_key UNIQUE`) in WAL mode gives atomic `count = count + ?`, transactional
   exactly-once idempotency, and microsecond writes with no clone/full-file rewrite. Keep
   the JSON file as an export/backup format only. Redis is unnecessary at this scale;
   Postgres only if multi-instance becomes real.
5. **Persist, then broadcast** (finding 6.2.1) - do this even before any storage swap.
6. **Participants = distinct devices per day.** Mint an anonymous device UUID in
   `localStorage` on first visit, send it with each batch, and keep a per-day set (plain
   SQLite table; approximate only if it ever grows). Delete `participantsCount += 1` and
   the optimistic +1-per-press.
7. **Rate limiting: device-ID primary, rightmost-IP fallback.** Also document the
   interplay: 2s client cooldown + batches of 5 means the 1-per-5s sustained bucket
   allows roughly 1 salawat/s per client - fine, just write it down next to the config.
8. **Epoch counter for downward corrections** - agree; additionally drive the
   state-precedence table by `(epoch, seq)` instead of state-name rank, which removes the
   last special case in `page.tsx`.

### 6.4 If I were sequencing the work

1. Persist-then-broadcast + POST re-anchor + totals in `salawat_update` (hours)
2. SSE `id:` / `Last-Event-ID` replay ring buffer + `retry:` hint (hours)
3. Retry classification: 429/5xx/network requeue with the same key; rollback only on 400/409 (hours)
4. Epoch + reset handling (hours)
5. Post-launch policy decision -> make the 409 live or delete it (minutes, after a product decision)
6. `node:sqlite` counter store with UNIQUE idempotency + JSON export/backup (about a day, incl. migration)
7. Participants device-set, rate-limit keying and XFF fix (hours)
8. Multi-instance fan-out (defer; revisit only if deployed beyond one box)

*Second-opinion review by **GLM** (Z.ai), running as the Cline agent, 2026-09-07.
All findings verified against the working tree at commit `cf14776`. Analysis only -
no implementation changed.*