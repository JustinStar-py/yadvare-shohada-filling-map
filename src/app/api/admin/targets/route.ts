import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { CampaignService } from "@/lib/server/campaign-service";
import { TargetOverrideSchema } from "@/types/campaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parseResult = TargetOverrideSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی نامعتبر است", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { date, target } = parseResult.data;
    const ip = req.headers.get("x-forwarded-for") || "admin";
    await CampaignService.setTargetOverride(date, target, ip);

    return NextResponse.json({ success: true, message: "هدف با موفقیت ذخیره شد" });
  } catch (error) {
    console.error("Target override error:", error);
    return NextResponse.json({ error: "خطا در تنظیم هدف" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "تاریخ مشخص نشده است" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "admin";
    await CampaignService.removeTargetOverride(date, ip);

    return NextResponse.json({ success: true, message: "هدف اختصاصی حذف شد" });
  } catch (error) {
    console.error("Remove target override error:", error);
    return NextResponse.json({ error: "خطا در حذف هدف اختصاصی" }, { status: 500 });
  }
}
