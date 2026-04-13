import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { connectToDatabase } from "@/lib/mongoose";
import { ApplicantModel } from "@/lib/models/applicant";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const form = await req.formData();
    const files = form.getAll("resumes").filter((entry): entry is File => entry instanceof File);
    let insertedCount = 0;
    const seenInBatch = new Set<string>();

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();

      const guessedName = file.name.replace(".pdf", "").replaceAll("_", " ");
      const fallbackEmail = `${guessedName.toLowerCase().replaceAll(" ", ".")}@unknown.local`;
      if (seenInBatch.has(fallbackEmail)) continue;
      seenInBatch.add(fallbackEmail);
      const resumeText = parsed.text.slice(0, 20000);

      // Extract lightweight skill signals from resume text for better screening quality.
      const inferredSkills = Array.from(
        new Set(
          ["typescript", "javascript", "react", "node", "python", "mongodb", "sql", "aws"]
            .filter((skill) => resumeText.toLowerCase().includes(skill))
            .map((skill) => skill.toUpperCase())
        )
      );

      const normalized = normalizeApplicantPayload({
        fullName: guessedName || "Unknown Candidate",
        email: fallbackEmail,
        yearsOfExperience: 0,
        education: "Not provided",
        skills: inferredSkills,
        summary: "Profile extracted from resume PDF upload",
        resumeText,
        source: "pdf",
        fileName: file.name,
      });

      await ApplicantModel.findOneAndUpdate(
        { email: normalized.email },
        normalized,
        { upsert: true, setDefaultsOnInsert: true }
      );
      await parser.destroy();
      insertedCount += 1;
    }

    return NextResponse.json({
      insertedCount,
      deduplicated: files.length - insertedCount,
      receivedCount: files.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while uploading resume files.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
