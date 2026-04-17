import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ApplicantModel } from "@/lib/models/applicant";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const applicants = await ApplicantModel.find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!applicants) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(applicants, { status: 200 });
  } catch (error) {
    console.error("Error loading applicants:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while loading applicants.";
    return NextResponse.json(
      { success: false, message, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Validate request body
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON in request body",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "Request body must be a valid object",
        },
        { status: 400 }
      );
    }

    // Normalize and validate applicant data
    let normalized;
    try {
      normalized = normalizeApplicantPayload(body);
    } catch (normError) {
      console.error("Normalization error:", normError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to process applicant data",
          details: normError instanceof Error ? normError.message : String(normError),
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!normalized.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    if (!normalized.fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name is required",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Save to database with full validation
    const applicantData = {
      ...normalized,
      source: (body.source as string) || normalized.source || "json",
    };

    const created = await ApplicantModel.findOneAndUpdate(
      { email: normalized.email },
      applicantData,
      {
        upsert: true,
        returnDocument: "after" as const,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    ).lean();

    if (!created) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to save applicant",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving applicant:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while saving applicant profile.";
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
