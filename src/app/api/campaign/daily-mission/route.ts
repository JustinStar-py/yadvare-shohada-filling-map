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
    const rawCycle = searchParams.get("cycle");
    const cycle = rawCycle ? parseInt(rawCycle, 10) || 0 : 0;
    const excludeId = searchParams.get("excludeId");

    if (!db.martyrs || db.martyrs.length === 0) {
      return NextResponse.json({ error: "لیست شهدا یافت نشد" }, { status: 404 });
    }

    const { martyrIndex, suggestedCount } = getDeterministicDailyMission(
      visitorId,
      clientDate,
      db.martyrs.length,
      cycle
    );

    let selectedIndex = martyrIndex;
    if (excludeId && db.martyrs.length > 1 && db.martyrs[selectedIndex]?.id === excludeId) {
      selectedIndex = (selectedIndex + 1) % db.martyrs.length;
    }

    const selectedMartyr = db.martyrs[selectedIndex] || db.martyrs[0];

    return NextResponse.json({
      success: true,
      date: clientDate,
      martyr: selectedMartyr,
      suggestedCount,
      visitorId,
      cycle,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "خطا در بازیابی عهد معنوی روزانه", details: String(error) },
      { status: 500 }
    );
  }
}
