import { z } from "zod";
import { MartyrProfileSchema } from "@/types/campaign";
const finiteCount = z.number().finite().nonnegative();
export const MissionStateSchema = z.enum(["ACTIVE", "READY_TO_LAUNCH", "LAUNCHING", "LAUNCHED"]);
export const SubmissionResponseSchema = z.object({
  success: z.literal(true), seq: finiteCount.int(), epoch: finiteCount.int(),
  currentCount: finiteCount, target: z.number().finite().positive(), totalCampaignSalawat: finiteCount,
  participantsCount: finiteCount, missionState: MissionStateSchema, isDuplicate: z.boolean(),
});
export const PublicStateSchema = z.object({
  serverTime: z.number().finite(), tehranDate: z.string(), memorialDate: z.string(), memorialTime: z.string().optional(),
  daysRemaining: z.number().finite(),
  campaignPhase: z.enum(["distant", "momentum", "approaching", "culmination", "memorial_day", "archived"]),
  mission: z.object({ date: z.string(), dayNumber: finiteCount, target: z.number().finite().positive(),
    currentCount: finiteCount, participantsCount: finiteCount, state: MissionStateSchema,
    epoch: finiteCount.int().optional(), launchTimestamp: z.number().finite().optional(),
    martyrId: z.string().optional(), isOverrideTarget: z.boolean() }),
  todayMartyr: MartyrProfileSchema.extend({ id: z.string() }).nullable(),
  todayMartyrs: z.array(MartyrProfileSchema.extend({ id: z.string() })).optional(),
  totalCampaignSalawat: finiteCount, totalLaunchesCount: finiteCount,
  constellation: z.array(z.object({ date: z.string(), dayNumber: finiteCount, salawatCount: finiteCount,
    target: finiteCount, martyrName: z.string(), x: z.number().finite(), y: z.number().finite(),
    brightness: z.number().finite(), launchedAt: z.number().finite() })),
  settings: z.object({ campaignTitle: z.string(), campaignSubtitle: z.string(), memorialTitle: z.string(),
    memorialDate: z.string(), memorialLocation: z.string(), memorialTime: z.string().optional(),
    visualPreset: z.enum(["calm", "balanced", "intense"]), finalMessage: z.string(), isCompleted: z.boolean(),
    activeMissileModel: z.string().optional(), shareMessage: z.string().optional(),
    enableAmbientSound: z.boolean().optional(), ambientSoundVolume: z.number().optional(),
    enablePlaygroundMusic: z.boolean().optional(), playgroundMusicVolume: z.number().optional() }).passthrough(),
});
export const PersonalMissionResponseSchema = z.object({
  success: z.literal(true), martyr: MartyrProfileSchema.extend({ id: z.string() }),
  suggestedCount: z.number().int().positive(),
});
