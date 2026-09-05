import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { CampaignService } from "@/lib/server/campaign-service";
import { UpdateSettingsSchema } from "@/types/campaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parseResult = UpdateSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی نامعتبر است", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "admin";
    const updated = await CampaignService.updateSettings(parseResult.data, ip);

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "خطا در ذخیره تنظیمات" }, { status: 500 });
  }
}
