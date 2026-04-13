import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { JobModel } from "@/lib/models/job";
import { ApplicantModel } from "@/lib/models/applicant";
import { ScreeningResultModel } from "@/lib/models/screening-result";

export const runtime = "nodejs";

export async function GET() {
  await connectToDatabase();

  const [jobs, applicants, screenings, latest] = await Promise.all([
    JobModel.countDocuments(),
    ApplicantModel.countDocuments(),
    ScreeningResultModel.countDocuments(),
    ScreeningResultModel.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  return NextResponse.json({
    jobs,
    applicants,
    screenings,
    latestScreeningAt: latest?.createdAt,
  });
}
