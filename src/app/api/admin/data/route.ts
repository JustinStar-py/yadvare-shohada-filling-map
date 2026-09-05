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
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin data error:", error);
    return NextResponse.json({ error: "خطا در دریافت اطلاعات ادمین" }, { status: 500 });
  }
}
