import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/lib/server/campaign-service";
import { SalawatSubmissionSchema } from "@/types/campaign";
import { checkSalawatRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "داده‌های ورودی نامعتبر است" }, { status: 400 });
    }

    const parseResult = SalawatSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی نامعتبر است", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { idempotencyKey, count, visitorId } = parseResult.data;

    // Dual-key rate limit: individual visitor token bucket + outer IP floodgate
    const rateCheck = checkSalawatRateLimit(req, visitorId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید." },
        { status: 429, headers: { "Retry-After": (rateCheck.retryAfter ?? 4).toString() } }
      );
    }

    const result = await CampaignService.submitSalawat(idempotencyKey, count, visitorId);

    if (!result.success) {
      return NextResponse.json(
        { error: "خطا در ثبت صلوات", result },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing salawat submission:", error);
    return NextResponse.json(
      { error: "خطای سرور در ثبت صلوات" },
      { status: 500 }
    );
  }
}
