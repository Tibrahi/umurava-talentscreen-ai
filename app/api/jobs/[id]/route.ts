import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { JobModel } from "@/lib/models/job";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const { id } = await params;
  const body = await req.json();
  const updated = await JobModel.findByIdAndUpdate(id, body, { new: true }).lean();
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const { id } = await params;
  await JobModel.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
