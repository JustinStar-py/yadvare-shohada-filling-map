import { z } from "zod";

export type MissionState = "ACTIVE" | "READY_TO_LAUNCH" | "LAUNCHING" | "LAUNCHED";

export interface MartyrProfile {
  id: string;
  name: string;
  title: string;
  photoUrl: string;
  birthDate?: string;
  martyrdomDate?: string;
  martyrdomLocation?: string;
  biography: string;
  quote?: string;
  assignedDate?: string; // YYYY-MM-DD
}

export interface DailyMission {
  date: string; // YYYY-MM-DD (Tehran time)
  dayNumber: number; // e.g. Day 1, Day 2
  target: number;
  currentCount: number;
  participantsCount: number;
  state: MissionState;
  epoch?: number; // Monotonically increasing revision/reset counter
  launchTimestamp?: number;
  martyrId?: string;
  isOverrideTarget: boolean;
}

export interface ConstellationStar {
  date: string;
  dayNumber: number;
  salawatCount: number;
  target: number;
  martyrName: string;
  x: number; // 0-100 percentage across sky
  y: number; // 0-100 percentage across sky
  brightness: number; // 0.5 - 1.0
  launchedAt: number;
}

export type MissileModel = "kheibar" | "fattah" | "sejjil" | "khorramshahr";

export interface CampaignSettings {
  campaignTitle: string;
  campaignSubtitle: string;
  memorialTitle: string;
  memorialDate: string; // ISO string or YYYY-MM-DD
  memorialTime?: string; // e.g. "19:00"
  memorialLocation: string;
  campaignStartDate: string; // YYYY-MM-DD
  campaignEndDate: string; // YYYY-MM-DD
  dailyResetHour: number; // 0-23, default 0 (midnight)
  startTarget: number;
  dailyIncrease: number;
  targetOverrides: Record<string, number>; // YYYY-MM-DD -> target
  adminPinHash: string; // scrypt-hashed admin PIN ("scrypt$<salt>$<hash>")
  /** @deprecated legacy plaintext PIN — migrated to adminPinHash automatically */
  adminPin?: string;
  visualPreset: "calm" | "balanced" | "intense";
  finalMessage: string;
  isCompleted: boolean;
  activeMissileModel?: MissileModel;
}

export interface AdminAuditLog {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  ip?: string;
}

export interface PublicCampaignState {
  serverTime: number; // UTC timestamp
  tehranDate: string; // YYYY-MM-DD
  memorialDate: string;
  memorialTime?: string;
  daysRemaining: number;
  campaignPhase: "distant" | "momentum" | "approaching" | "culmination" | "memorial_day" | "archived";
  mission: DailyMission;
  todayMartyr: MartyrProfile | null;
  todayMartyrs?: MartyrProfile[];
  totalCampaignSalawat: number;
  totalLaunchesCount: number;
  constellation: ConstellationStar[];
  settings: {
    campaignTitle: string;
    campaignSubtitle: string;
    memorialTitle: string;
    memorialDate: string;
    memorialLocation: string;
    memorialTime?: string;
    visualPreset: "calm" | "balanced" | "intense";
    finalMessage: string;
    isCompleted: boolean;
    activeMissileModel?: MissileModel;
  };
}

// Zod validation schemas
export const SalawatSubmissionSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  count: z.number().int().min(1).max(50).default(1),
  clientTimestamp: z.number().optional(),
  visitorId: z.string().min(8).max(64).optional(),
  clientEpoch: z.number().int().min(0).optional(),
});

export type SalawatSubmissionInput = z.infer<typeof SalawatSubmissionSchema>;

export interface SalawatSubmissionResponse {
  success: boolean;
  seq: number;
  epoch: number;
  currentCount: number;
  target: number;
  totalCampaignSalawat: number;
  participantsCount: number;
  missionState: MissionState;
  isDuplicate: boolean;
}

export interface SseSalawatUpdatePayload {
  seq: number;
  epoch: number;
  date: string;
  currentCount: number;
  target: number;
  totalCampaignSalawat: number;
  participantsCount: number;
  state: MissionState;
}

export const AdminAuthSchema = z.object({
  pin: z.string().min(4).max(32),
});

export const UpdateSettingsSchema = z.object({
  campaignTitle: z.string().min(2).max(100).optional(),
  campaignSubtitle: z.string().max(200).optional(),
  memorialTitle: z.string().min(2).max(100).optional(),
  memorialDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memorialTime: z.string().max(20).optional(),
  memorialLocation: z.string().max(200).optional(),
  campaignStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  campaignEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dailyResetHour: z.number().int().min(0).max(23).optional(),
  startTarget: z.number().int().min(100).max(1000000).optional(),
  dailyIncrease: z.number().int().min(0).max(50000).optional(),
  visualPreset: z.enum(["calm", "balanced", "intense"]).optional(),
  finalMessage: z.string().max(500).optional(),
  adminPin: z.string().min(4).max(32).optional(),
  activeMissileModel: z.enum(["kheibar", "fattah", "sejjil", "khorramshahr"]).optional(),
});

export const TargetOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target: z.number().int().min(100).max(10000000),
});

export const BulkSalawatSchema = z.object({
  count: z.number().int().min(1).max(100000),
});

export const MartyrProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  title: z.string().max(100).default("شهید والامقام"),
  photoUrl: z.string().default(""),
  birthDate: z.string().optional(),
  martyrdomDate: z.string().optional(),
  martyrdomLocation: z.string().optional(),
  biography: z.string().min(5),
  quote: z.string().optional(),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
