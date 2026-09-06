import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { CampaignService } from "@/lib/server/campaign-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی. لطفاً وارد شوید." }, { status: 401 });
  }

  try {
    const data = await CampaignService.getAdminDashboardData();

    // Never expose the PIN hash (or legacy plaintext PIN) to the client
    const safeSettings = { ...data.settings } as Record<string, unknown>;
    delete safeSettings.adminPinHash;
    delete safeSettings.adminPin;

    return NextResponse.json({ ...data, settings: safeSettings });
  } catch (error) {
    console.error("Admin data error:", error);
    return NextResponse.json({ error: "خطا در دریافت اطلاعات ادمین" }, { status: 500 });
  }
}
