import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/lib/server/campaign-service";
import { SalawatSubmissionSchema } from "@/types/campaign";
import { salawatLimiter, getClientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!salawatLimiter.tryConsume(getClientIp(req))) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید." },
        { status: 429, headers: { "Retry-After": "5" } }
      );
    }

    const body = await req.json();
    const parseResult = SalawatSubmissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی نامعتبر است", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { idempotencyKey, count } = parseResult.data;
    const result = await CampaignService.submitSalawat(idempotencyKey, count);

    if (!result.success) {
      // e.g. the day's rocket already launched — the press was not counted
      return NextResponse.json(
        { error: "پرواز امروز ثبت شده است و صلوات جدیدی پذیرفته نمی‌شود.", result },
        { status: 409 }
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
