import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { CampaignService } from "@/lib/server/campaign-service";
import { BulkSalawatSchema } from "@/types/campaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = BulkSalawatSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی نامعتبر است", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "admin";
    const result = await CampaignService.adminAddSalawat(parseResult.data.count, ip);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Admin bulk salawat error:", error);
    const message = error instanceof Error ? error.message : "خطا در ثبت صلوات آزمایشی";
    return NextResponse.json({ error: "خطا در ثبت صلوات آزمایشی", details: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "admin";
    const result = await CampaignService.resetTodaySalawat(ip);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin reset salawat error:", error);
    const message = error instanceof Error ? error.message : "خطا در صفر کردن صلوات‌ها";
    return NextResponse.json({ error: "خطا در صفر کردن صلوات‌ها", details: message }, { status: 500 });
  }
}
