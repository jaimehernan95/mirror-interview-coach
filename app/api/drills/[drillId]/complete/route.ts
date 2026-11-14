import { NextRequest, NextResponse } from "next/server";
import { DrillsRepository } from "@/lib/repositories/drills.repository";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ drillId: string }> }
) {
  try {
    const { drillId } = await params;
    const ok = await DrillsRepository.completeDrill(drillId);

    return NextResponse.json({
      success: ok,
      drillId,
      message: ok ? "Drill marked as completed." : "Drill not found.",
    });
  } catch (error) {
    console.error("Error completing drill:", error);
    return NextResponse.json(
      { error: "Failed to update drill status." },
      { status: 500 }
    );
  }
}
