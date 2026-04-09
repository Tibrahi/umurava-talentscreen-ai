import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ApplicantModel } from "@/lib/models/applicant";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const normalized = normalizeApplicantPayload(body);
    const updated = await ApplicantModel.findByIdAndUpdate(
      id,
      { ...normalized, source: body.source || normalized.source || "json" },
      { new: true }
    ).lean();
    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while updating applicant.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    await ApplicantModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while deleting applicant.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
