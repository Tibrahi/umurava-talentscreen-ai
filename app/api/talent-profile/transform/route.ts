import { NextResponse } from "next/server";
import { transformRawToTalentProfile } from "@/lib/talent-profile/transform";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const profile = transformRawToTalentProfile(body);
  return NextResponse.json(profile, { status: 200 });
}

