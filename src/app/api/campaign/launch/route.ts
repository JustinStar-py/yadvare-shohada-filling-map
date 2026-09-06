import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/lib/server/campaign-service";
import { publicLaunchLimiter, getClientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public launch trigger:
 * When the community target is fulfilled, any user entering or completing
 * the launch countdown seals the day's launch and lights today's star
 * in the constellation. The target-reached check happens inside the same
 * atomic transaction as the launch (no check-then-act race), and the launch
 * itself stays strictly idempotent (one star per day).
 */
export async function POST(req: NextRequest) {
  if (!publicLaunchLimiter.tryConsume(getClientIp(req))) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید." },
      { status: 429, headers: { "Retry-After": "10" } }
    );
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "client";
    const result = await CampaignService.triggerLaunch(ip, { requireTargetReached: true });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.message.includes("قبلاً") ? 409 : 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Public campaign launch error:", error);
    return NextResponse.json({ error: "خطا در ثبت پرواز" }, { status: 500 });
  }
}
