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

export interface DatabaseSchema {
  settings: CampaignSettings;
  missions: Record<string, DailyMission>;
  martyrs: MartyrProfile[];
  constellation: ConstellationStar[];
  idempotencyKeys: Record<string, { timestamp: number; count: number }>;
  auditLogs: AdminAuditLog[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "campaign_db.json");

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
    campaignTitle: "پویش معنوی یادواره شهدا",
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
    adminPin: "1357",
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

/**
 * Ensure database file exists on disk
 */
async function ensureDbInitialized(): Promise<void> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      const initialData = getInitialData();
      await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

/**
 * Reads database state atomically
 */
export async function readDb(): Promise<DatabaseSchema> {
  return dbMutex.runExclusive(async () => {
    await ensureDbInitialized();
    try {
      const content = await fs.readFile(DB_FILE, "utf-8");
      return JSON.parse(content) as DatabaseSchema;
    } catch (err) {
      console.error("Error reading database:", err);
      return getInitialData();
    }
  });
}

/**
 * Writes database state atomically
 */
export async function writeDb(data: DatabaseSchema): Promise<void> {
  return dbMutex.runExclusive(async () => {
    await ensureDbInitialized();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tempFile, DB_FILE);
  });
}

/**
 * Mutates database state inside atomic transaction
 */
export async function mutateDb<T>(
  mutator: (data: DatabaseSchema) => Promise<{ data: DatabaseSchema; result: T }> | { data: DatabaseSchema; result: T }
): Promise<T> {
  return dbMutex.runExclusive(async () => {
    await ensureDbInitialized();
    let currentData: DatabaseSchema;
    try {
      const content = await fs.readFile(DB_FILE, "utf-8");
      currentData = JSON.parse(content) as DatabaseSchema;
    } catch {
      currentData = getInitialData();
    }

    const { data: updatedData, result } = await mutator(currentData);
    
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(updatedData, null, 2), "utf-8");
    await fs.rename(tempFile, DB_FILE);

    return result;
  });
}
