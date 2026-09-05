import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { CampaignService } from "@/lib/server/campaign-service";
import { MartyrProfile, MartyrProfileSchema } from "@/types/campaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parseResult = MartyrProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "اطلاعات شهید ناقص یا نامعتبر است", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "admin";
    const martyr = await CampaignService.upsertMartyr(
      parseResult.data as MartyrProfile,
      ip
    );

    return NextResponse.json({ success: true, martyr });
  } catch (error) {
    console.error("Martyr upsert error:", error);
    return NextResponse.json({ error: "خطا در ذخیره اطلاعات شهید" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "عدم دسترسی" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه شهید مشخص نشده است" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "admin";
    await CampaignService.deleteMartyr(id, ip);

    return NextResponse.json({ success: true, message: "شهید با موفقیت حذف شد" });
  } catch (error) {
    console.error("Martyr delete error:", error);
    return NextResponse.json({ error: "خطا در حذف شهید" }, { status: 500 });
  }
}
