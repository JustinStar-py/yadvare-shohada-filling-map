import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Public lightweight feed of all martyr portraits for the cinematic
 * memorial intro. Only id/name/photo — no biographies.
 */
export async function GET() {
  try {
    const db = await readDb();
    const portraits = (db.martyrs || [])
      .filter((m) => m && m.photoUrl)
      .map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl }));

    return NextResponse.json(
      { success: true, count: portraits.length, portraits },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "خطا در بازیابی تصاویر شهدا", details: String(error) },
      { status: 500 }
    );
  }
}
