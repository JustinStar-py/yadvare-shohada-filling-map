import { neon } from "@neondatabase/serverless";
import {
  CampaignSettings,
  DailyMission,
  MartyrProfile,
  ConstellationStar,
  AdminAuditLog,
  DEFAULT_SHARE_MESSAGE,
} from "@/types/campaign";
import { getShahidiehMartyrProfiles } from "@/lib/data/shohada-shahidieh";
import { getTehranDateString } from "@/lib/utils";
import { hashPin } from "./pin";
import type { DatabaseSchema } from "./db";

const IDEMPOTENCY_TTL_MS = 48 * 60 * 60 * 1000;
const AUDIT_LOG_CAP = 500;
const DAILY_VISITORS_RETENTION_DAYS = 14;
const MAX_CAS_ATTEMPTS = 8;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL/POSTGRES_URL is not set");
  return url;
}

let ensureTablePromise: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      const sql = neon(getConnectionString());
      await sql`
        CREATE TABLE IF NOT EXISTS campaign_state (
          id INT PRIMARY KEY,
          data JSONB NOT NULL,
          version BIGINT NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  return ensureTablePromise;
}

function getInitialData(): DatabaseSchema {
  const today = getTehranDateString();

  const now = new Date();
  const memorialDate = "2026-09-17";
  const initialMartyrs: MartyrProfile[] = getShahidiehMartyrProfiles();

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
    campaignTitle: "پویش معنوی یادواره ۷۶ شهید شهیدیه میبد",
    campaignSubtitle: "هر صلوات، یک قدم تا پرواز به سوی افق روشن شهادت",
    memorialTitle: "یادواره ۷۶ شهید والامقام شهیدیه میبد",
    memorialDate: memorialDate,
    memorialTime: "19:00",
    memorialLocation: "میبد, شهیدیه, مسجد امام (ره)",
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
    shareMessage: DEFAULT_SHARE_MESSAGE,
  };

  return {
    settings: initialSettings,
    missions: {
      [today]: todayMission,
    },
    martyrs: initialMartyrs,
    constellation: initialConstellation,
    dailyVisitors: {},
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
      currentCount: Math.max(0, Number(mission.currentCount) || 0),
      participantsCount: Math.max(0, Number(mission.participantsCount) || 0),
      target: Math.max(1, Number(mission.target) || 1),
    };
  }

  const dailyVisitors: Record<string, string[]> = {};
  if (db.dailyVisitors && typeof db.dailyVisitors === "object") {
    for (const [date, list] of Object.entries(db.dailyVisitors)) {
      if (Array.isArray(list)) {
        dailyVisitors[date] = list.filter((h): h is string => typeof h === "string");
      }
    }
  }

  return {
    settings: db.settings,
    missions,
    martyrs: Array.isArray(db.martyrs) ? db.martyrs : [],
    constellation: Array.isArray(db.constellation) ? db.constellation : [],
    dailyVisitors,
    idempotencyKeys:
      db.idempotencyKeys && typeof db.idempotencyKeys === "object" ? db.idempotencyKeys : {},
    auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs : [],
    totalCampaignSalawat:
      typeof db.totalCampaignSalawat === "number" ? db.totalCampaignSalawat : undefined,
  };
}

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
  const cutoff = new Date(now - DAILY_VISITORS_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  for (const date of Object.keys(data.dailyVisitors)) {
    if (date < cutoff) delete data.dailyVisitors[date];
  }
}

function backfillTotal(data: DatabaseSchema): void {
  if (typeof data.totalCampaignSalawat !== "number") {
    let sum = 0;
    for (const m of Object.values(data.missions)) {
      sum += m.currentCount || 0;
    }
    data.totalCampaignSalawat = sum;
  }
}

type StoredRow = { data: unknown; version: number };

async function readRow(): Promise<StoredRow | null> {
  const sql = neon(getConnectionString());
  await ensureTable();
  const rows = (await sql`SELECT data, version FROM campaign_state WHERE id = 1`) as Array<{
    data: unknown;
    version: number | string;
  }>;
  if (rows.length === 0) return null;
  return { data: rows[0].data, version: Number(rows[0].version) };
}

function parseStoredData(raw: unknown): DatabaseSchema | null {
  const value = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
  if (!isValidDb(value)) return null;
  return normalizeDb(value);
}

export async function readDb(): Promise<DatabaseSchema> {
  const row = await readRow();
  if (row) {
    const parsed = parseStoredData(row.data);
    if (parsed) {
      backfillTotal(parsed);
      return parsed;
    }
  }
  // First run (or corrupt row): seed from local file state when possible so
  // production keeps today's counts instead of resetting to demo values.
  const seed = await loadSeedFromFileOrInitial();
  const sql = neon(getConnectionString());
  await sql`
    INSERT INTO campaign_state (id, data, version)
    VALUES (1, ${JSON.stringify(seed)}::jsonb, 1)
    ON CONFLICT (id) DO NOTHING
  `;
  const retry = await readRow();
  if (retry) {
    const parsed = parseStoredData(retry.data);
    if (parsed) {
      backfillTotal(parsed);
      return parsed;
    }
  }
  return seed;
}

async function loadSeedFromFileOrInitial(): Promise<DatabaseSchema> {
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const content = await readFile(join(process.cwd(), "data", "campaign_db.json"), "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (isValidDb(parsed)) {
      const db = normalizeDb(parsed);
      backfillTotal(db);
      return db;
    }
  } catch {
    // Corrupt/missing file or read-only fs: fall through to fresh state.
  }
  const fresh = getInitialData();
  backfillTotal(fresh);
  return fresh;
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  const sql = neon(getConnectionString());
  await ensureTable();
  pruneDb(data);
  backfillTotal(data);
  await sql`
    INSERT INTO campaign_state (id, data, version)
    VALUES (1, ${JSON.stringify(data)}::jsonb, 1)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = campaign_state.version + 1, updated_at = NOW()
  `;
}

export async function mutateDb<T>(
  mutator: (
    data: DatabaseSchema
  ) => Promise<{ data: DatabaseSchema; result: T }> | { data: DatabaseSchema; result: T }
): Promise<T> {
  const sql = neon(getConnectionString());
  await ensureTable();
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const row = await readRow();
    if (!row) {
      await readDb();
      continue;
    }
    const current = parseStoredData(row.data);
    if (!current) {
      throw new Error("campaign_state row is corrupt and cannot be parsed");
    }
    backfillTotal(current);
    const workingCopy = structuredClone(current);
    let updatedData: DatabaseSchema;
    let result: T;
    try {
      const out = await mutator(workingCopy);
      updatedData = out.data;
      result = out.result;
    } catch (err) {
      throw err;
    }
    pruneDb(updatedData);
    backfillTotal(updatedData);
    const written = (await sql`
      UPDATE campaign_state
      SET data = ${JSON.stringify(updatedData)}::jsonb, version = version + 1, updated_at = NOW()
      WHERE id = 1 AND version = ${row.version}
      RETURNING version
    `) as Array<{ version: number }>;
    if (written.length === 1) return result;
    lastError = new Error(`version conflict on attempt ${attempt + 1}`);
    await new Promise((r) => setTimeout(r, 10 + Math.random() * 25));
  }
  throw lastError instanceof Error ? lastError : new Error("mutateDb failed after retries");
}

/**
 * On serverless there is no cross-request RAM to defer writes to: fast and
 * slow mutators both persist synchronously inside the request.
 */
export async function mutateDbFast<T>(
  mutator: (
    data: DatabaseSchema
  ) => Promise<{ data: DatabaseSchema; result: T }> | { data: DatabaseSchema; result: T }
): Promise<T> {
  return mutateDb(mutator);
}

export async function flushDirtyState(): Promise<void> {
  return;
}

export async function forceFlush(): Promise<void> {
  return;
}
