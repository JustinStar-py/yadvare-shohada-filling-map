import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/lib/server/campaign-service";
import { SalawatSubmissionSchema } from "@/types/campaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing salawat submission:", error);
    return NextResponse.json(
      { error: "خطای سرور در ثبت صلوات" },
      { status: 500 }
    );
  }
}
