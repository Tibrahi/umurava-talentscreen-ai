import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { JobModel } from "@/lib/models/job";
import { ApplicantModel } from "@/lib/models/applicant";
import { ScreeningResultModel } from "@/lib/models/screening-result";
import { buildFallbackShortlist, isGeminiQuotaError, runGeminiScreening } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = (await req.json()) as { jobId: string; topN: 10 | 20; applicantIds?: string[] };

    const job = await JobModel.findById(body.jobId).lean();
    if (!job) return NextResponse.json({ message: "Job not found." }, { status: 404 });

    const applicants = await ApplicantModel.find(
      body.applicantIds?.length ? { _id: { $in: body.applicantIds } } : {}
    ).lean();
    if (!applicants.length) {
      return NextResponse.json({ message: "No applicants available for screening." }, { status: 400 });
    }

    const screening = await ScreeningResultModel.create({
      jobId: job._id,
      topN: body.topN,
      status: "processing",
      rankedCandidates: [],
    });

    const screeningInput = {
      job: {
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        minimumExperience: job.minimumExperience,
        education: job.education,
      },
      applicants: applicants.map((applicant) => ({
        _id: String(applicant._id),
        fullName: applicant.fullName,
        yearsOfExperience: applicant.yearsOfExperience,
        education: applicant.education,
        skills: applicant.skills,
        summary: applicant.summary,
        resumeText: applicant.resumeText,
        profileData: applicant.profileData,
      })),
      topN: body.topN,
    };

    let aiResult: Awaited<ReturnType<typeof runGeminiScreening>>;
    let usedFallback = false;
    try {
      aiResult = await runGeminiScreening(screeningInput);
    } catch (error) {
      if (!isGeminiQuotaError(error)) throw error;
      aiResult = buildFallbackShortlist(screeningInput);
      usedFallback = true;
    }

    screening.status = "completed";
    screening.rankedCandidates = aiResult.shortlist
      .filter((candidate) => mongoose.Types.ObjectId.isValid(candidate.candidateId))
      .map((candidate, index) => ({
        applicantId: new mongoose.Types.ObjectId(candidate.candidateId),
        rank: candidate.rank || index + 1,
        matchScore: Math.max(0, Math.min(100, candidate.matchScore)),
        strengths: candidate.strengths ?? [],
        gapsAndRisks: candidate.gaps ?? [],
        explanation: candidate.explanation ?? "",
        recommendation: candidate.recommendation ?? "Consider",
      }));
    await screening.save();

    const updated = await ScreeningResultModel.findById(screening._id).lean();
    if (usedFallback) {
      return NextResponse.json({
        ...updated,
        message:
          "Gemini quota exceeded. Fallback scoring was used for this screening. Update your Gemini billing/quota for full AI reasoning.",
      });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while running screening.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
