import fs from "fs/promises";
import path from "path";
import {
  CampaignSettings,
  DailyMission,
  MartyrProfile,
  ConstellationStar,
  AdminAuditLog,
} from "@/types/campaign";
import { getTehranDateString } from "@/lib/utils";
import { hashPin } from "./pin";

export interface DatabaseSchema {
  settings: CampaignSettings;
  missions: Record<string, DailyMission>;
  martyrs: MartyrProfile[];
  constellation: ConstellationStar[];
  idempotencyKeys: Record<string, { timestamp: number; count: number }>;
  auditLogs: AdminAuditLog[];
  totalCampaignSalawat?: number;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "campaign_db.json");
const BACKUP_FILE = path.join(DB_DIR, "campaign_db.backup.json");
const TMP_PREFIX = "campaign_db.json.tmp.";
const STALE_TMP_MS = 60 * 60 * 1000;
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 48 * 60 * 60 * 1000;
const AUDIT_LOG_CAP = 500;

// Asynchronous in-memory mutex to ensure atomic disk reads and writes
class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = current.then(() => next);
    await current;
    try {
      return await callback();
    } finally {
      release!();
    }
  }
}

const dbMutex = new AsyncMutex();

// In-memory cache: avoids re-reading the file on every request (single-process server)
let cachedDb: DatabaseSchema | null = null;
let lastBackupAt = 0;
let writeCounter = 0;

/**
 * Generates initial default database state
 */
function getInitialData(): DatabaseSchema {
  const today = getTehranDateString(); // e.g. 2026-09-01

  // Calculate memorial date 15 days in the future
  const now = new Date();
  const memorialDateObj = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const memorialDate = getTehranDateString(memorialDateObj);

  // Initial martyrs
  const initialMartyrs: MartyrProfile[] = [
    {
      id: "martyr-1",
      name: "شهید محمدابراهیم همت",
      title: "فرمانده لشکر ۲۷ محمد رسول‌الله (ص)",
      photoUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80",
      birthDate: "۱۳۳۴/۰۱/۱۲",
      martyrdomDate: "۱۳۶۲/۱۲/۱۷",
      martyrdomLocation: "جزیره مجنون (عملیات خیبر)",
      biography: "سردار خیبر، معلمی صبور و فرمانده‌ای شجاع که با تدبیر و ایمان خود، نامی جاودان در تاریخ دفاع مقدس بر جای گذاشت. کلام پرصلابت و دل پرمهرش، پناه رزمندگان در سخت‌ترین لحظات نبرد بود.",
      quote: "نام من اگر بماند برایم مهم نیست، اسلام باید بماند و پیروز شود.",
      assignedDate: today,
    },
    {
      id: "martyr-2",
      name: "شهید مهدی باکری",
      title: "فرمانده لشکر ۳۱ عاشورا",
      photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80",
      birthDate: "۱۳۳۳/۰۱/۳۰",
      martyrdomDate: "۱۳۶۳/۱۲/۲۵",
      martyrdomLocation: "شرق دجله (عملیات بدر)",
      biography: "شهردار پیشین ارومیه و سردار مخلص اروند، مردی از جنس اخلاص و خاکساری که تا آخرین قطره خون در کنار نیروهایش ایستاد و پیکر پاکش به زلالی آب‌های اروند پیوست.",
      quote: "ایمان در سختی‌ها و عمل در اخلاص تجلی می‌یابد.",
      assignedDate: getTehranDateString(new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)),
    },
    {
      id: "martyr-3",
      name: "شهید احمد کاظمی",
      title: "فرمانده نیروی زمینی سپاه",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      birthDate: "۱۳۳۷/۰۳/۰۶",
      martyrdomDate: "۱۳۸۴/۱۰/۱۹",
      martyrdomLocation: "ارومیه",
      biography: "فاتح خرمشهر و پرچم‌دار خط‌شکنی در عملیات‌های فتح‌المبین و بیت‌المقدس که تا آخرین لحظه حیات مبارک خویش، بی‌قرار وصال به همرزمان شهیدش بود.",
      quote: "دست از کار و تلاش برای اعتلای نام اهل‌بیت برندارید.",
      assignedDate: getTehranDateString(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
    },
    {
      id: "martyr-4",
      name: "شهید مهدی زین‌الدین",
      title: "فرمانده لشکر ۱۷ علی بن ابی‌طالب (ع)",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
      birthDate: "۱۳۳۸/۰۷/۱۸",
      martyrdomDate: "۱۳۶۳/۰۸/۲۷",
      martyrdomLocation: "سردشت",
      biography: "فرمانده جوان و نخبه هوش و استراتژی در جنگ، که همواره بر تقوا، نظم و خدمت خالصانه به محرومان تاکید می‌ورزید.",
      quote: "اولین شرط لازم برای پاسداری از اسلام، خودسازی و جهاد اکبر است.",
      assignedDate: getTehranDateString(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
    },
  ];

  // Initial constellation stars representing previous days' launches
  const initialConstellation: ConstellationStar[] = [
    {
      date: getTehranDateString(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      dayNumber: 1,
      salawatCount: 8420,
      target: 8000,
      martyrName: "شهید مصطفی چمران",
      x: 22,
      y: 28,
      brightness: 0.95,
      launchedAt: now.getTime() - 2 * 24 * 60 * 60 * 1000,
    },
    {
      date: getTehranDateString(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
      dayNumber: 2,
      salawatCount: 9150,
      target: 8500,
      martyrName: "شهید سید مرتضی آوینی",
      x: 74,
      y: 35,
      brightness: 0.9,
      launchedAt: now.getTime() - 1 * 24 * 60 * 60 * 1000,
    },
  ];

  // Initial mission for today
  const todayMission: DailyMission = {
    date: today,
    dayNumber: 3,
    target: 10000,
    currentCount: 6420,
    participantsCount: 482,
    state: "ACTIVE",
    martyrId: "martyr-1",
    isOverrideTarget: false,
  };

  const initialSettings: CampaignSettings = {
    campaignTitle: " پویش معنوی یادواره شهدای شهیدیه",
    campaignSubtitle: "هر صلوات، یک قدم تا پرواز به سوی افق روشن شهادت",
    memorialTitle: "یادواره شهدای والامقام و والامقامان میهن",
    memorialDate: memorialDate,
    memorialLocation: "تهران، مصلای بزرگ امام خمینی (ره) - سالن همایش‌های بین‌المللی",
    campaignStartDate: getTehranDateString(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
    campaignEndDate: memorialDate,
    dailyResetHour: 0,
    startTarget: 8000,
    dailyIncrease: 500,
    targetOverrides: {},
    adminPinHash: hashPin("279279"),
    visualPreset: "balanced",
    finalMessage: "در این مسیر نورانی، با هم هزاران صلوات تقدیم روح پرفتوح شهدا کردیم. یادشان تا ابد در دل‌ها جاودان باد.",
    isCompleted: false,
  };

  return {
    settings: initialSettings,
    missions: {
      [today]: todayMission,
    },
    martyrs: initialMartyrs,
    constellation: initialConstellation,
    idempotencyKeys: {},
    auditLogs: [
      {
        id: "log-init",
        timestamp: Date.now(),
        action: "INITIALIZATION",
        details: "پایگاه داده اولیه با موفقیت راه‌اندازی شد.",
      },
    ],
  };
}

function isValidDb(value: unknown): value is DatabaseSchema {
  if (!value || typeof value !== "object") return false;
  const db = value as DatabaseSchema;
  return (
    !!db.settings &&
    typeof db.settings === "object" &&
    typeof db.settings.campaignStartDate === "string"
  );
}

function normalizeDb(db: DatabaseSchema): DatabaseSchema {
  const missions: DatabaseSchema["missions"] = {};
  for (const [date, mission] of Object.entries(db.missions ?? {})) {
    if (!mission || typeof mission !== "object") continue;
    missions[date] = {
      ...mission,
      // Sanitize corrupted / hand-edited values so the UI can never render
      // negative counts or targets
      currentCount: Math.max(0, Number(mission.currentCount) || 0),
      participantsCount: Math.max(0, Number(mission.participantsCount) || 0),
      target: Math.max(1, Number(mission.target) || 1),
    };
  }

  return {
    settings: db.settings,
    missions,
    martyrs: Array.isArray(db.martyrs) ? db.martyrs : [],
    constellation: Array.isArray(db.constellation) ? db.constellation : [],
    idempotencyKeys:
      db.idempotencyKeys && typeof db.idempotencyKeys === "object" ? db.idempotencyKeys : {},
    auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs : [],
    totalCampaignSalawat:
      typeof db.totalCampaignSalawat === "number" ? db.totalCampaignSalawat : undefined,
  };
}

async function readJsonFile(file: string): Promise<DatabaseSchema | null> {
  try {
    const content = await fs.readFile(file, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (!isValidDb(parsed)) return null;
    return normalizeDb(parsed);
  } catch {
    return null;
  }
}

/**
 * Loads from disk with corruption recovery: primary file → backup → fresh state.
 */
async function loadIntoCache(): Promise<DatabaseSchema> {
  if (cachedDb) {
    if (typeof cachedDb.totalCampaignSalawat !== "number") {
      let sum = 0;
      for (const m of Object.values(cachedDb.missions)) {
        sum += m.currentCount || 0;
      }
      cachedDb.totalCampaignSalawat = sum;
    }
    return cachedDb;
  }

  let db = await readJsonFile(DB_FILE);
  if (!db) {
    console.error("[db] Primary database unreadable or corrupt, attempting backup recovery…");
    db = await readJsonFile(BACKUP_FILE);
    if (db) {
      console.warn("[db] Recovered database from backup file.");
      try {
        await persistDb(db); // Heal: restore recovered state to the primary file
      } catch (error) {
        console.error("[db] Failed to heal primary file from backup:", error);
      }
    }
  }

  if (!db) {
    console.warn("[db] No valid database or backup found — starting with a fresh database.");
    db = getInitialData();
    try {
      await persistDb(db);
    } catch (error) {
      console.error("[db] Failed to persist initial database:", error);
    }
  }

  if (typeof db.totalCampaignSalawat !== "number") {
    let sum = 0;
    for (const m of Object.values(db.missions)) {
      sum += m.currentCount || 0;
    }
    db.totalCampaignSalawat = sum;
  }

  cachedDb = db;
  return cachedDb;
}

/**
 * Ensure database directory exists and clean stale temp files from crashed writers
 */
async function ensureDbInitialized(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    const entries = await fs.readdir(DB_DIR);
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.startsWith(TMP_PREFIX)) continue;
      const fullPath = path.join(DB_DIR, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (now - stat.mtimeMs > STALE_TMP_MS) await fs.unlink(fullPath);
      } catch {
        // Ignore individual cleanup failures
      }
    }
  } catch {
    // Directory read failure is non-fatal
  }
}

/**
 * Durable atomic write: fsync temp file, rotate a backup of the previous good
 * state (time-throttled), then atomically rename over the primary file.
 */
async function persistDb(data: DatabaseSchema): Promise<void> {
  const tempFile = `${DB_FILE}.tmp.${process.pid}.${++writeCounter}`;
  const handle = await fs.open(tempFile, "w");
  try {
    await handle.writeFile(JSON.stringify(data, null, 2), "utf-8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  if (Date.now() - lastBackupAt > BACKUP_INTERVAL_MS) {
    const tempBackup = `${BACKUP_FILE}.tmp.${process.pid}`;
    try {
      await fs.copyFile(DB_FILE, tempBackup);
      await fs.rename(tempBackup, BACKUP_FILE);
      lastBackupAt = Date.now();
    } catch {
      // Primary file may not exist yet (first ever write) — safe to ignore
    }
  }

  await fs.rename(tempFile, DB_FILE);
  cachedDb = data;
}

/**
 * Bounded-growth housekeeping: prune expired idempotency keys and cap audit logs
 */
function pruneDb(data: DatabaseSchema): void {
  const now = Date.now();
  for (const key of Object.keys(data.idempotencyKeys)) {
    if (now - data.idempotencyKeys[key].timestamp > IDEMPOTENCY_TTL_MS) {
      delete data.idempotencyKeys[key];
    }
  }
  if (data.auditLogs.length > AUDIT_LOG_CAP) {
    data.auditLogs.length = AUDIT_LOG_CAP;
  }
}

let isDirty = false;
let flushTimer: NodeJS.Timeout | null = null;
let currentFlushPromise: Promise<void> | null = null;
const WRITE_BEHIND_INTERVAL_MS = 500;

function scheduleWriteBehindFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushDirtyState().catch((err) => {
      console.error("[db] Background write-behind flush failed:", err);
    });
  }, WRITE_BEHIND_INTERVAL_MS);
}

/**
 * Flushes dirty in-memory database state to disk atomically.
 */
export async function flushDirtyState(): Promise<void> {
  if (!isDirty || !cachedDb) return;
  if (currentFlushPromise) {
    await currentFlushPromise;
    if (!isDirty || !cachedDb) return;
  }

  currentFlushPromise = (async () => {
    try {
      await dbMutex.runExclusive(async () => {
        if (!isDirty || !cachedDb) return;
        const snapshot = structuredClone(cachedDb);
        isDirty = false;
        pruneDb(snapshot);
        await persistDb(snapshot);
      });
    } finally {
      currentFlushPromise = null;
    }
  })();

  await currentFlushPromise;
}

/**
 * Synchronously waits for any pending background write-behind flush to complete.
 */
export async function forceFlush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushDirtyState();
}

/**
 * Fast in-memory mutator for high-frequency writes (Salawat recitations).
 * Mutates working state in RAM immediately (<0.05ms) and schedules
 * a debounced background disk sync (every 500ms).
 */
export async function mutateDbFast<T>(
  mutator: (
    data: DatabaseSchema
  ) => Promise<{ data: DatabaseSchema; result: T }> | { data: DatabaseSchema; result: T }
): Promise<T> {
  await ensureDbInitialized();
  const current = await loadIntoCache();

  const { data: updatedData, result } = await mutator(current);
  cachedDb = updatedData;
  isDirty = true;
  scheduleWriteBehindFlush();

  return result;
}

/**
 * Reads database state (cached after first load, mutex-protected)
 */
export async function readDb(): Promise<DatabaseSchema> {
  return dbMutex.runExclusive(async () => {
    await ensureDbInitialized();
    return loadIntoCache();
  });
}

/**
 * Writes database state atomically
 */
export async function writeDb(data: DatabaseSchema): Promise<void> {
  return dbMutex.runExclusive(async () => {
    await ensureDbInitialized();
    pruneDb(data);
    await persistDb(data);
  });
}

/**
 * Mutates database state inside an atomic transaction.
 * Works on a clone, so a failed mutator can never corrupt the cached state.
 */
export async function mutateDb<T>(
  mutator: (
    data: DatabaseSchema
  ) => Promise<{ data: DatabaseSchema; result: T }> | { data: DatabaseSchema; result: T }
): Promise<T> {
  // If there are pending dirty changes from write-behind, flush them first
  if (isDirty) {
    await forceFlush();
  }

  return dbMutex.runExclusive(async () => {
    await ensureDbInitialized();
    const workingCopy = structuredClone(await loadIntoCache());

    const { data: updatedData, result } = await mutator(workingCopy);
    pruneDb(updatedData);
    await persistDb(updatedData);

    return result;
  });
}

// Clean process shutdown handlers so dirty buffers are safely flushed
if (typeof process !== "undefined" && typeof process.on === "function") {
  const handleExit = () => {
    if (isDirty) {
      forceFlush().catch(() => {});
    }
  };
  process.on("beforeExit", handleExit);
  process.on("SIGTERM", handleExit);
  process.on("SIGINT", handleExit);
}
