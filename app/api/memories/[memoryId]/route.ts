import { NextRequest, NextResponse } from "next/server";
import { MemoriesRepository } from "@/lib/repositories/memories.repository";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params;
    const body = await req.json();
    const { action, reason = "User requested update", observation } = body;

    if (action === "dispute") {
      const ok = await MemoriesRepository.disputeMemory(memoryId, reason);
      return NextResponse.json({ success: ok, action: "disputed", memoryId });
    }

    if (action === "edit") {
      if (!observation || !observation.trim()) {
        return NextResponse.json(
          { error: "New observation text is required for edit action." },
          { status: 400 }
        );
      }
      const ok = await MemoriesRepository.editMemoryObservation(
        memoryId,
        observation.trim(),
        reason
      );
      return NextResponse.json({ success: ok, action: "edited", memoryId });
    }

    if (action === "deprecate") {
      const ok = await MemoriesRepository.deprecateMemory(memoryId, reason);
      return NextResponse.json({ success: ok, action: "deprecated", memoryId });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: dispute, edit, deprecate." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating governed memory:", error);
    return NextResponse.json(
      { error: "Failed to update memory." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params;
    const ok = await MemoriesRepository.purgeMemory(memoryId);

    return NextResponse.json({
      success: ok,
      purged: ok,
      memoryId,
      message: ok
        ? "Memory purged permanently (Right to be Forgotten)."
        : "Memory not found or already deleted.",
    });
  } catch (error) {
    console.error("Error purging memory:", error);
    return NextResponse.json(
      { error: "Failed to purge memory." },
      { status: 500 }
    );
  }
}
