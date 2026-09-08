import {
  PublicCampaignState,
  DailyMission,
  MartyrProfile,
  ConstellationStar,
  CampaignSettings,
  AdminAuditLog,
  SalawatSubmissionResponse,
} from "@/types/campaign";
import { readDb, mutateDb, mutateDbFast, forceFlush, DatabaseSchema } from "./db";
import { sseBroadcaster } from "./sse-broadcaster";
import { getTehranDateString, getDaysDifference, generateUUID } from "@/lib/utils";
import { hashPin } from "./pin";

const globalForCampaign = globalThis as unknown as {
  __dailyVisitors?: Map<string, Set<string>>;
};
const dailyVisitors: Map<string, Set<string>> =
  globalForCampaign.__dailyVisitors ?? new Map<string, Set<string>>();
globalForCampaign.__dailyVisitors = dailyVisitors;

export class CampaignService {
  /**
   * Calculates target for a given date based on formula or manual override
   */
  static calculateTargetForDate(
    dateStr: string,
    settings: CampaignSettings
  ): { target: number; isOverride: boolean } {
    if (settings.targetOverrides[dateStr] !== undefined) {
      return {
        target: settings.targetOverrides[dateStr],
        isOverride: true,
      };
    }

    const dayDiff = Math.max(0, getDaysDifference(settings.campaignStartDate, dateStr));
    const formulaTarget = settings.startTarget + dayDiff * settings.dailyIncrease;
    return {
      target: formulaTarget,
      isOverride: false,
    };
  }

  /**
   * Resolves martyr for a given date
   */
  static resolveMartyrForDate(
    dateStr: string,
    martyrs: MartyrProfile[],
    dayNumber: number
  ): MartyrProfile | null {
    if (martyrs.length === 0) return null;

    // First check explicit assignment
    const explicit = martyrs.find((m) => m.assignedDate === dateStr);
    if (explicit) return explicit;

    // Fallback: round-robin by dayNumber
    const index = (dayNumber - 1) % martyrs.length;
    return martyrs[index] ?? martyrs[0] ?? null;
  }

  /**
   * Ensures mission for given date is initialized in database
   */
  static ensureMissionForDate(db: DatabaseSchema, dateStr: string): DailyMission {
    if (db.missions[dateStr]) {
      if (typeof db.missions[dateStr].epoch !== "number") {
        db.missions[dateStr].epoch = 1;
      }
      return db.missions[dateStr];
    }

    const dayNumber = Math.max(1, getDaysDifference(db.settings.campaignStartDate, dateStr) + 1);
    const { target, isOverride } = this.calculateTargetForDate(dateStr, db.settings);
    const martyr = this.resolveMartyrForDate(dateStr, db.martyrs, dayNumber);

    const newMission: DailyMission = {
      date: dateStr,
      dayNumber,
      target,
      currentCount: 0,
      participantsCount: 0,
      state: "ACTIVE",
      epoch: 1,
      martyrId: martyr ? martyr.id : undefined,
      isOverrideTarget: isOverride,
    };

    db.missions[dateStr] = newMission;
    return newMission;
  }

  /**
   * Fetches public authoritative campaign state
   */
  static async getPublicState(): Promise<PublicCampaignState> {
    const db = await readDb();
    const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
    const mission = this.ensureMissionForDate(db, today);

    const daysRemaining = getDaysDifference(today, db.settings.memorialDate);

    // Determine campaign phase
    let campaignPhase: PublicCampaignState["campaignPhase"] = "distant";
    if (db.settings.isCompleted || daysRemaining < 0) {
      campaignPhase = "archived";
    } else if (daysRemaining === 0) {
      campaignPhase = "memorial_day";
    } else if (daysRemaining <= 3) {
      campaignPhase = "culmination";
    } else if (daysRemaining <= 7) {
      campaignPhase = "approaching";
    } else if (daysRemaining <= 15) {
      campaignPhase = "momentum";
    } else {
      campaignPhase = "distant";
    }

    // Resolve today's martyr
    const todayMartyr = this.resolveMartyrForDate(today, db.martyrs, mission.dayNumber);

    // Calculate total campaign statistics using cached running counter
    let totalCampaignSalawat = typeof db.totalCampaignSalawat === "number" ? db.totalCampaignSalawat : 0;
    if (typeof db.totalCampaignSalawat !== "number") {
      for (const m of Object.values(db.missions)) {
        totalCampaignSalawat += m.currentCount || 0;
      }
    }
    // The constellation is the source of truth: triggerLaunch upserts today's
    // star, so its length already counts today's launch exactly once.
    const totalLaunchesCount = db.constellation.length;

    return {
      serverTime: Date.now(),
      tehranDate: today,
      memorialDate: db.settings.memorialDate,
      memorialTime: db.settings.memorialTime || "19:00",
      daysRemaining: Math.max(0, daysRemaining),
      campaignPhase,
      mission,
      todayMartyr,
      totalCampaignSalawat,
      totalLaunchesCount,
      constellation: db.constellation,
      settings: {
        campaignTitle: db.settings.campaignTitle,
        campaignSubtitle: db.settings.campaignSubtitle,
        memorialTitle: db.settings.memorialTitle,
        memorialDate: db.settings.memorialDate,
        memorialLocation: db.settings.memorialLocation,
        memorialTime: db.settings.memorialTime || "19:00",
        visualPreset: db.settings.visualPreset,
        finalMessage: db.settings.finalMessage,
        isCompleted: db.settings.isCompleted,
      },
    };
  }

  /**
   * Idempotent contribution submission
   */
  static async submitSalawat(
    idempotencyKey: string,
    count: number = 1,
    visitorId?: string
  ): Promise<SalawatSubmissionResponse> {
    return mutateDbFast<SalawatSubmissionResponse>(async (db) => {
      const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
      const mission = this.ensureMissionForDate(db, today);
      const epoch = mission.epoch ?? 1;

      // Post-launch seal: if today's rocket already launched, reject new recitations for today
      if (mission.state === "LAUNCHED") {
        return {
          data: db,
          result: {
            success: false,
            seq: sseBroadcaster.getCurrentSeq(),
            epoch,
            currentCount: mission.currentCount,
            target: mission.target,
            totalCampaignSalawat: db.totalCampaignSalawat ?? 0,
            participantsCount: mission.participantsCount,
            missionState: mission.state,
            isDuplicate: false,
          },
        };
      }

      // Check idempotency
      if (db.idempotencyKeys[idempotencyKey]) {
        return {
          data: db,
          result: {
            success: true,
            seq: sseBroadcaster.getCurrentSeq(),
            epoch,
            currentCount: mission.currentCount,
            target: mission.target,
            totalCampaignSalawat: db.totalCampaignSalawat ?? 0,
            participantsCount: mission.participantsCount,
            missionState: mission.state,
            isDuplicate: true,
          },
        };
      }

      // Record contribution
      mission.currentCount = Math.max(0, mission.currentCount + count);

      // Track true unique participant
      let visitorsForToday = dailyVisitors.get(today);
      if (!visitorsForToday) {
        visitorsForToday = new Set<string>();
        dailyVisitors.set(today, visitorsForToday);
      }
      if (visitorId) {
        if (!visitorsForToday.has(visitorId)) {
          visitorsForToday.add(visitorId);
          mission.participantsCount = Math.max(0, (mission.participantsCount || 0) + 1);
        }
      } else if (!mission.participantsCount) {
        mission.participantsCount = 1;
      }

      // Update running totalCampaignSalawat in O(1)
      db.totalCampaignSalawat = Math.max(0, (db.totalCampaignSalawat ?? 0) + count);

      // Update state if target reached and mission was active
      if (mission.currentCount >= mission.target && mission.state === "ACTIVE") {
        mission.state = "READY_TO_LAUNCH";
      }

      // Save idempotency key
      db.idempotencyKeys[idempotencyKey] = {
        timestamp: Date.now(),
        count,
      };

      const nextSeq = sseBroadcaster.getCurrentSeq() + 1;

      // Broadcast realtime update to all subscribers
      const assignedSeq = sseBroadcaster.broadcast("salawat_update", {
        seq: nextSeq,
        epoch,
        date: today,
        currentCount: mission.currentCount,
        target: mission.target,
        totalCampaignSalawat: db.totalCampaignSalawat,
        participantsCount: mission.participantsCount,
        state: mission.state,
      });

      return {
        data: db,
        result: {
          success: true,
          seq: assignedSeq,
          epoch,
          currentCount: mission.currentCount,
          target: mission.target,
          totalCampaignSalawat: db.totalCampaignSalawat,
          participantsCount: mission.participantsCount,
          missionState: mission.state,
          isDuplicate: false,
        },
      };
    });
  }

  /**
   * Authoritative daily launch trigger.
   * Strictly enforces at most ONE launch per mission date, and (optionally)
   * that the daily target has been reached before sealing the day.
   */
  static async triggerLaunch(
    ip: string = "system",
    options: { requireTargetReached?: boolean } = {}
  ): Promise<{
    success: boolean;
    message: string;
    mission: DailyMission;
    newStar?: ConstellationStar;
  }> {
    const requireTargetReached = options.requireTargetReached ?? false;

    return mutateDb<{
      success: boolean;
      message: string;
      mission: DailyMission;
      newStar?: ConstellationStar;
    }>(async (db) => {
      const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
      const mission = this.ensureMissionForDate(db, today);

      if (mission.state === "LAUNCHED") {
        return {
          data: db,
          result: {
            success: false,
            message: "راکت امروز قبلاً با موفقیت پرتاب شده است.",
            mission,
          },
        };
      }

      // Public (non-admin) trigger is only valid once the community quota is met
      if (requireTargetReached && mission.currentCount < mission.target) {
        return {
          data: db,
          result: {
            success: false,
            message: "ظرفیت صلوات امروز هنوز به حد نصاب نرسیده است.",
            mission,
          },
        };
      }

      // Transition mission to LAUNCHED
      mission.state = "LAUNCHED";
      mission.launchTimestamp = Date.now();

      const martyr = this.resolveMartyrForDate(today, db.martyrs, mission.dayNumber);

      // Create permanent constellation star
      // Deterministic spread across sky based on dayNumber
      const x = ((mission.dayNumber * 37 + 13) % 80) + 10; // 10% to 90%
      const y = ((mission.dayNumber * 23 + 19) % 45) + 15; // 15% to 60%

      const newStar: ConstellationStar = {
        date: today,
        dayNumber: mission.dayNumber,
        salawatCount: mission.currentCount,
        target: mission.target,
        martyrName: martyr ? martyr.name : "شهید گمنام",
        x,
        y,
        brightness: 1.0,
        launchedAt: mission.launchTimestamp,
      };

      // Add to constellation if not already added
      const existingStarIndex = db.constellation.findIndex((s) => s.date === today);
      if (existingStarIndex === -1) {
        db.constellation.push(newStar);
      } else {
        db.constellation[existingStarIndex] = newStar;
      }

      // Add audit log
      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "LAUNCH_EXECUTED",
        details: `پرتاب راکت روز ${mission.dayNumber} با ${mission.currentCount} صلوات انجام شد.`,
        ip,
      });

      // Broadcast launch event to all connected clients
      sseBroadcaster.broadcast("launch_event", {
        mission,
        newStar,
      });

      return {
        data: db,
        result: {
          success: true,
          message: "پرتاب راکت با موفقیت ثبت شد و ستاره جدید در آسمان پویش روشن گردید.",
          mission,
          newStar,
        },
      };
    });
  }

  /**
   * Admin: Reset today's launch state back to ACTIVE / READY_TO_LAUNCH
   * and remove today's star from the constellation for re-testing.
   */
  static async resetTodayLaunch(ip: string = "admin"): Promise<{
    success: boolean;
    message: string;
    mission: DailyMission;
  }> {
    return mutateDb(async (db) => {
      const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
      const mission = this.ensureMissionForDate(db, today);

      mission.state = mission.currentCount >= mission.target ? "READY_TO_LAUNCH" : "ACTIVE";
      mission.epoch = (mission.epoch || 1) + 1;
      delete mission.launchTimestamp;

      db.constellation = db.constellation.filter((s) => s.date !== today);

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "RESET_LAUNCH",
        details: `بازنشانی پرتاب راکت امروز (${today}) توسط مدیر.`,
        ip,
      });

      const nextSeqLaunch = sseBroadcaster.getCurrentSeq() + 1;
      sseBroadcaster.broadcast("salawat_update", {
        seq: nextSeqLaunch,
        epoch: mission.epoch,
        date: today,
        currentCount: mission.currentCount,
        target: mission.target,
        totalCampaignSalawat: db.totalCampaignSalawat ?? 0,
        state: mission.state,
        participantsCount: mission.participantsCount,
      });

      return {
        data: db,
        result: {
          success: true,
          message: "وضعیت پرتاب راکت امروز با موفقیت بازنشانی گردید و امکان پرتاب دوباره فعال شد.",
          mission,
        },
      };
    });
  }

  /**
   * Admin: Reset today's salawat count to zero for testing.
   */
  static async resetTodaySalawat(ip: string = "admin"): Promise<{
    success: boolean;
    message: string;
    mission: DailyMission;
  }> {
    return mutateDb(async (db) => {
      const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
      const mission = this.ensureMissionForDate(db, today);

      mission.currentCount = 0;
      mission.participantsCount = 0;
      mission.state = "ACTIVE";
      mission.epoch = (mission.epoch || 1) + 1;
      delete mission.launchTimestamp;

      dailyVisitors.get(today)?.clear();

      // Recalculate running total
      let sum = 0;
      for (const m of Object.values(db.missions)) {
        sum += m.currentCount || 0;
      }
      db.totalCampaignSalawat = sum;

      db.constellation = db.constellation.filter((s) => s.date !== today);

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "RESET_SALAWAT",
        details: `صفر کردن صلوات‌های امروز (${today}) توسط مدیر.`,
        ip,
      });

      const nextSeqReset = sseBroadcaster.getCurrentSeq() + 1;
      sseBroadcaster.broadcast("salawat_update", {
        seq: nextSeqReset,
        epoch: mission.epoch,
        date: today,
        currentCount: 0,
        target: mission.target,
        totalCampaignSalawat: db.totalCampaignSalawat,
        state: mission.state,
        participantsCount: 0,
      });

      return {
        data: db,
        result: {
          success: true,
          message: "صلوات‌های امروز صفر شدند و وضعیت مأموریت بازنشانی گردید.",
          mission,
        },
      };
    });
  }

  /**
   * Admin: Update Campaign Settings
   */
  static async updateSettings(
    settingsUpdate: Partial<CampaignSettings>,
    ip?: string
  ): Promise<CampaignSettings> {
    return mutateDb(async (db) => {
      const { adminPin, ...rest } = settingsUpdate;

      // Never persist a new PIN as plaintext — hash it instead
      if (adminPin && adminPin.length >= 4) {
        db.settings.adminPinHash = hashPin(adminPin);
        delete (db.settings as unknown as Record<string, unknown>).adminPin;
      }

      db.settings = {
        ...db.settings,
        ...rest,
      };

      // Recalculate today's target if startTarget or increase changed
      const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
      if (db.missions[today] && !db.missions[today].isOverrideTarget) {
        const { target } = this.calculateTargetForDate(today, db.settings);
        db.missions[today].target = target;
      }

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "SETTINGS_UPDATED",
        details: "تنظیمات کلی پویش بروزرسانی شد.",
        ip,
      });

      return {
        data: db,
        result: db.settings,
      };
    });
  }

  /**
   * Admin: Set explicit target override
   */
  static async setTargetOverride(date: string, target: number, ip?: string): Promise<void> {
    return mutateDb(async (db) => {
      db.settings.targetOverrides[date] = target;

      if (db.missions[date]) {
        db.missions[date].target = target;
        db.missions[date].isOverrideTarget = true;
      }

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "TARGET_OVERRIDE_SET",
        details: `هدف اختصاصی تاریخ ${date} به ${target} صلوات تغییر یافت.`,
        ip,
      });

      return {
        data: db,
        result: undefined,
      };
    });
  }

  /**
   * Admin: Remove explicit target override
   */
  static async removeTargetOverride(date: string, ip?: string): Promise<void> {
    return mutateDb(async (db) => {
      delete db.settings.targetOverrides[date];

      if (db.missions[date]) {
        const { target } = this.calculateTargetForDate(date, db.settings);
        db.missions[date].target = target;
        db.missions[date].isOverrideTarget = false;
      }

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "TARGET_OVERRIDE_REMOVED",
        details: `هدف اختصاصی تاریخ ${date} حذف و به فرمول خودکار بازگشت.`,
        ip,
      });

      return {
        data: db,
        result: undefined,
      };
    });
  }

  /**
   * Admin: Add or update Martyr profile
   */
  static async upsertMartyr(martyr: MartyrProfile, ip?: string): Promise<MartyrProfile> {
    return mutateDb(async (db) => {
      const id = martyr.id || `martyr-${Date.now()}`;
      const record: MartyrProfile = { ...martyr, id };

      const existingIndex = db.martyrs.findIndex((m) => m.id === id);
      if (existingIndex >= 0) {
        db.martyrs[existingIndex] = record;
      } else {
        db.martyrs.push(record);
      }

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "MARTYR_UPSERTED",
        details: `اطلاعات ${record.name} ذخیره شد.`,
        ip,
      });

      return {
        data: db,
        result: record,
      };
    });
  }

  /**
   * Admin: Delete Martyr profile
   */
  static async deleteMartyr(id: string, ip?: string): Promise<boolean> {
    return mutateDb(async (db) => {
      const martyr = db.martyrs.find((m) => m.id === id);
      db.martyrs = db.martyrs.filter((m) => m.id !== id);

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "MARTYR_DELETED",
        details: `شهید ${martyr?.name || id} از سامانه حذف شد.`,
        ip,
      });

      return {
        data: db,
        result: true,
      };
    });
  }

  /**
   * Admin: bulk-add salawat for testing (bypasses the public per-request cap)
   */
  static async adminAddSalawat(
    count: number,
    ip?: string
  ): Promise<{ currentCount: number; target: number; state: DailyMission["state"] }> {
    const res = await mutateDbFast<{ currentCount: number; target: number; state: DailyMission["state"] }>(async (db) => {
      const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
      const mission = this.ensureMissionForDate(db, today);

      mission.currentCount += count;
      if (mission.currentCount >= mission.target && mission.state === "ACTIVE") {
        mission.state = "READY_TO_LAUNCH";
      }

      let totalCampaignSalawat = typeof db.totalCampaignSalawat === "number" ? db.totalCampaignSalawat : 0;
      if (typeof db.totalCampaignSalawat !== "number") {
        for (const m of Object.values(db.missions)) {
          totalCampaignSalawat += m.currentCount || 0;
        }
      }
      db.totalCampaignSalawat = totalCampaignSalawat + count;

      db.auditLogs.unshift({
        id: generateUUID(),
        timestamp: Date.now(),
        action: "ADMIN_SALAWAT_BULK",
        details: `${count} صلوات آزمایشی توسط مدیریت ثبت شد.`,
        ip,
      });

      const nextSeq = sseBroadcaster.getCurrentSeq() + 1;
      const epoch = mission.epoch || 1;

      sseBroadcaster.broadcast("salawat_update", {
        seq: nextSeq,
        epoch,
        date: today,
        currentCount: mission.currentCount,
        target: mission.target,
        totalCampaignSalawat: db.totalCampaignSalawat,
        participantsCount: mission.participantsCount,
        state: mission.state,
      });

      return {
        data: db,
        result: {
          currentCount: mission.currentCount,
          target: mission.target,
          state: mission.state,
        },
      };
    });
    await forceFlush().catch(() => {});
    return res;
  }

  /**
   * Admin: Get all data for dashboard
   */
  static async getAdminDashboardData(): Promise<{
    settings: CampaignSettings;
    missions: Record<string, DailyMission>;
    martyrs: MartyrProfile[];
    constellation: ConstellationStar[];
    auditLogs: AdminAuditLog[];
    todayMission: DailyMission;
  }> {
    const db = await readDb();
    const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);
    const todayMission = this.ensureMissionForDate(db, today);

    return {
      settings: db.settings,
      missions: db.missions,
      martyrs: db.martyrs,
      constellation: db.constellation,
      auditLogs: db.auditLogs.slice(0, 50),
      todayMission,
    };
  }
}
