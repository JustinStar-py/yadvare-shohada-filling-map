import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { CampaignService } from "@/lib/server/campaign-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "admin";
    const result = await CampaignService.triggerLaunch(ip);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin launch error:", error);
    return NextResponse.json({ error: "خطا در اجرای پرتاب" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "admin";
    const result = await CampaignService.resetTodayLaunch(ip);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin reset launch error:", error);
    return NextResponse.json({ error: "خطا در بازنشانی پرتاب" }, { status: 500 });
  }
}
