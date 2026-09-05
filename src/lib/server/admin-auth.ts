import { NextRequest } from "next/server";
import { readDb } from "./db";

export async function verifyAdminAuth(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  const cookiePin = req.cookies.get("admin_pin")?.value;

  const providedPin = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : cookiePin;

  if (!providedPin) return false;

  const db = await readDb();
  return db.settings.adminPin === providedPin;
}
