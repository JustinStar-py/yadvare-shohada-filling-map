import { NextRequest, NextResponse } from "next/server";
import { readDb, mutateDb } from "@/lib/server/db";
import { AdminAuthSchema } from "@/types/campaign";
import { adminAuthLimiter, getClientIp } from "@/lib/server/rate-limit";
import { verifyPin, hashPin } from "@/lib/server/pin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  if (!adminAuthLimiter.tryConsume(clientIp)) {
    return NextResponse.json(
      { error: "تلاش‌های ناموفق بیش از حد مجاز. لطفاً ۱۵ دقیقه دیگر دوباره امتحان کنید." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  try {
    const body = await req.json();
    const parseResult = AdminAuthSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "رمز عبور نامعتبر است" }, { status: 400 });
    }

    const { pin } = parseResult.data;
    const db = await readDb();
    const settings = db.settings as unknown as Record<string, unknown>;
    const storedHash = settings.adminPinHash as string | undefined;
    const legacyPin = settings.adminPin as string | undefined;
    const stored = storedHash ?? legacyPin ?? "";

    if (!verifyPin(pin, stored)) {
      return NextResponse.json({ error: "رمز عبور مدیریت نادرست است" }, { status: 401 });
    }

    // One-time upgrade: hash a legacy plaintext PIN after successful auth
    if (!storedHash && legacyPin) {
      try {
        await mutateDb(async (data) => {
          if (!data.settings.adminPinHash) {
            data.settings.adminPinHash = hashPin(pin);
            delete (data.settings as unknown as Record<string, unknown>).adminPin;
          }
          return { data, result: undefined };
        });
      } catch (error) {
        console.error("Failed to migrate legacy admin PIN to hash:", error);
      }
    }

    const response = NextResponse.json({ success: true, message: "احراز هویت موفقیت‌آمیز بود" });
    response.cookies.set("admin_pin", pin, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
