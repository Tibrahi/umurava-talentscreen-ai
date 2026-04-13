import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { JobModel } from "@/lib/models/job";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const jobs = await JobModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(jobs);
  } catch (error) {
    // Returning structured errors helps the UI show actionable setup guidance.
    const message =
      error instanceof Error ? error.message : "Unexpected database error while loading jobs.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const created = await JobModel.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected database error while creating job.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
