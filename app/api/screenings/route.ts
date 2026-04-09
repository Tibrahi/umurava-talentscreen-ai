import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ScreeningResultModel } from "@/lib/models/screening-result";

export const runtime = "nodejs";

export async function GET() {
  await connectToDatabase();
  const screenings = await ScreeningResultModel.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(screenings);
}
