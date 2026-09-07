import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";
import { getTehranDateString, getDeterministicDailyMission } from "@/lib/utils";
import { getClientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = await readDb();
    const today = getTehranDateString(new Date(), db.settings.dailyResetHour ?? 0);

    const { searchParams } = new URL(req.url);
    const clientDate = searchParams.get("date") || today;
    const rawVisitorId = searchParams.get("visitorId");
    const ip = getClientIp(req);
    const visitorId = rawVisitorId && rawVisitorId.trim().length > 0 ? rawVisitorId.trim() : `ip:${ip}`;

    if (!db.martyrs || db.martyrs.length === 0) {
      return NextResponse.json({ error: "لیست شهدا یافت نشد" }, { status: 404 });
    }

    const { martyrIndex, suggestedCount } = getDeterministicDailyMission(
      visitorId,
      clientDate,
      db.martyrs.length
    );

    const selectedMartyr = db.martyrs[martyrIndex] || db.martyrs[0];

    return NextResponse.json({
      success: true,
      date: clientDate,
      martyr: selectedMartyr,
      suggestedCount,
      visitorId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "خطا در بازیابی عهد معنوی روزانه", details: String(error) },
      { status: 500 }
    );
  }
}
