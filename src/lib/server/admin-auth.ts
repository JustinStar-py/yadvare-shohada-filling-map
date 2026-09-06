import { NextRequest } from "next/server";
import { readDb, mutateDb } from "./db";
import { verifyPin, hashPin } from "./pin";

export async function verifyAdminAuth(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  const cookiePin = req.cookies.get("admin_pin")?.value;

  const providedPin = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : cookiePin;

  if (!providedPin) return false;

  const db = await readDb();
  const settings = db.settings as unknown as Record<string, unknown>;
  const storedHash = settings.adminPinHash as string | undefined;
  const legacyPin = settings.adminPin as string | undefined;
  const stored = storedHash ?? legacyPin ?? "";

  if (!verifyPin(providedPin, stored)) return false;

  // One-time upgrade: hash a legacy plaintext PIN after a successful auth
  if (!storedHash && legacyPin) {
    try {
      await mutateDb(async (data) => {
        if (!data.settings.adminPinHash) {
          data.settings.adminPinHash = hashPin(providedPin);
          delete (data.settings as unknown as Record<string, unknown>).adminPin;
        }
        return { data, result: undefined };
      });
    } catch (error) {
      console.error("Failed to migrate legacy admin PIN to hash:", error);
    }
  }

  return true;
}
