import { NextResponse } from "next/server";
import { CampaignService } from "@/lib/server/campaign-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await CampaignService.getPublicState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Error fetching campaign state:", error);
    return NextResponse.json(
      { error: "خطا در دریافت وضعیت پویش" },
      { status: 500 }
    );
  }
}
