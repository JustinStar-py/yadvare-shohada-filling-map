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
    const body = await req.json();
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
    return NextResponse.json({ error: "خطا در ثبت صلوات آزمایشی" }, { status: 500 });
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
    return NextResponse.json({ error: "خطا در صفر کردن صلوات‌ها" }, { status: 500 });
  }
}
