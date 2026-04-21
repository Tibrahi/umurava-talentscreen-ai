import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ApplicantModel } from "@/lib/models/applicant";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";
import { migrateApplicantToStructured } from "@/lib/migration";

export const runtime = "nodejs";

/**
 * GET single applicant by ID
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid applicant ID format",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let applicant = await ApplicantModel.findById(id);

    if (!applicant) {
      return NextResponse.json(
        {
          success: false,
          message: "Applicant not found",
        },
        { status: 404 }
      );
    }

    // Auto-migrate if structuredProfile is missing or empty
    if (
      !applicant.structuredProfile ||
      (typeof applicant.structuredProfile === "object" &&
        Object.keys(applicant.structuredProfile).length === 0)
    ) {
      try {
        const migrated = await migrateApplicantToStructured(id);
        if (migrated) {
          applicant = migrated;
        }
      } catch (migrationError) {
        console.error("Migration failed during GET:", migrationError);
        // Continue anyway - return what we have
      }
    }

    const responseData = applicant.toObject ? applicant.toObject() : applicant;
    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching applicant:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while fetching applicant.";
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

/**
 * UPDATE applicant by ID
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid applicant ID format",
        },
        { status: 400 }
      );
    }

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

    await connectToDatabase();

    // Check if applicant exists
    const existingApplicant = await ApplicantModel.findById(id);
    if (!existingApplicant) {
      return NextResponse.json(
        {
          success: false,
          message: "Applicant not found",
        },
        { status: 404 }
      );
    }

    // Update applicant with validation
    const updated = await ApplicantModel.findByIdAndUpdate(
      id,
      {
        ...normalized,
        source: (body.source as string) || normalized.source || "json",
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update applicant",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating applicant:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while updating applicant.";
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

/**
 * DELETE applicant by ID
 */
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid applicant ID format",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const applicant = await ApplicantModel.findByIdAndDelete(id);

    if (!applicant) {
      return NextResponse.json(
        {
          success: false,
          message: "Applicant not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Applicant deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting applicant:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while deleting applicant.";
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
