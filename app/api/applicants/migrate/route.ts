import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { batchMigrateApplicants } from "@/lib/migration";

export const runtime = "nodejs";

/**
 * POST /api/applicants/migrate
 * Batch migrate all applicants to new schema
 */
export async function POST() {
  try {
    await connectToDatabase();
    const results = await batchMigrateApplicants();

    return NextResponse.json(
      {
        success: true,
        message: `Migration completed: ${results.successful} successful, ${results.failed} failed`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Migration API error:", error);
    const message =
      error instanceof Error ? error.message : "Migration failed";

    return NextResponse.json(
      {
        success: false,
        message,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
