import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ApplicantModel } from "@/lib/models/applicant";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const applicants = await ApplicantModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(applicants);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while loading applicants.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const normalized = normalizeApplicantPayload(body as Record<string, unknown>);

    const created = await ApplicantModel.findOneAndUpdate(
      { email: normalized.email },
      {
        ...normalized,
        source: body.source || normalized.source || "json",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while saving applicant profile.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
