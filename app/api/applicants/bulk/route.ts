import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ApplicantModel } from "@/lib/models/applicant";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = (await req.json()) as { applicants: Array<Record<string, unknown>> };
    const applicants = body.applicants ?? [];
    const uniqueByEmail = new Map<string, Record<string, unknown>>();
    applicants.forEach((item) => {
      const normalized = normalizeApplicantPayload(item);
      uniqueByEmail.set(normalized.email, item);
    });

    await Promise.all(
      Array.from(uniqueByEmail.values()).map((item) => {
        const normalized = normalizeApplicantPayload(item);
        return ApplicantModel.findOneAndUpdate(
          { email: normalized.email },
          { ...normalized, source: item.source ?? "csv" },
          { upsert: true, setDefaultsOnInsert: true }
        );
      })
    );

    return NextResponse.json({
      insertedCount: uniqueByEmail.size,
      receivedCount: applicants.length,
      deduplicated: applicants.length - uniqueByEmail.size,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while bulk uploading applicants.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
