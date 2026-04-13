import { GoogleGenerativeAI } from "@google/generative-ai";

interface ScreeningPromptInput {
  job: {
    title: string;
    description: string;
    requiredSkills: string[];
    minimumExperience: number;
    education: string;
  };
  applicants: Array<{
    _id: string;
    fullName: string;
    yearsOfExperience: number;
    education: string;
    skills: string[];
    summary?: string;
    resumeText?: string;
    profileData?: Record<string, unknown>;
  }>;
  topN: 10 | 20;
}

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const SYSTEM_PROMPT_FOR_SCREENING = `
You are an expert HR recruiter and talent assessment specialist working for Umurava.
Your job is to objectively screen and rank candidates for a specific job role.

You will be given:
1. A detailed JOB DESCRIPTION
2. A list of CANDIDATES (each with full structured profile)

Evaluation Rules (strictly follow):
- Skills match: 40% weight
- Experience relevance: 30% weight  
- Education & certifications: 15% weight
- Overall relevance & cultural fit: 15% weight

For EVERY candidate you MUST return:
- matchScore: number between 0-100 (be strict and realistic)
- strengths: 2-3 bullet points
- gaps: 1-3 bullet points (honest risks or missing requirements)
- explanation: 2-3 sentence natural, professional explanation
- recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend"

Return ONLY valid JSON in this exact structure. Do not add any extra text.

{
  "shortlist": [
    {
      "candidateId": "string",
      "rank": number,
      "matchScore": number,
      "strengths": ["string", "string"],
      "gaps": ["string"],
      "explanation": "string",
      "recommendation": "string"
    }
  ]
}

Be fair, transparent, and data-driven. Never invent information not present in the profile.
`;

interface ShortlistItem {
  candidateId: string;
  rank: number;
  matchScore: number;
  strengths: string[];
  gaps: string[];
  explanation: string;
  recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
}

export const isGeminiQuotaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.toLowerCase().includes("quota exceeded");
};

// Heuristic fallback keeps screening functional when Gemini quota is unavailable.
// It uses the same weighting model so recruiters still get deterministic rankings.
export const buildFallbackShortlist = (input: ScreeningPromptInput): { shortlist: ShortlistItem[] } => {
  const requiredSkills = new Set(input.job.requiredSkills.map((skill) => skill.toLowerCase().trim()));

  const shortlist = input.applicants
    .map((candidate) => {
      const candidateSkills = candidate.skills.map((skill) => skill.toLowerCase().trim());
      const matchedSkills = candidateSkills.filter((skill) => requiredSkills.has(skill));
      const skillsScore = requiredSkills.size
        ? (matchedSkills.length / requiredSkills.size) * 40
        : 20;

      const expRatio = input.job.minimumExperience
        ? Math.min(candidate.yearsOfExperience / input.job.minimumExperience, 1)
        : 1;
      const experienceScore = expRatio * 30;

      const educationScore = candidate.education.toLowerCase().includes(input.job.education.toLowerCase())
        ? 15
        : 7;

      const relevanceScore = candidate.summary?.length ? 15 : 8;
      const score = Math.round(Math.min(100, skillsScore + experienceScore + educationScore + relevanceScore));

      const recommendation: ShortlistItem["recommendation"] =
        score >= 85 ? "Strongly Recommend" : score >= 70 ? "Recommend" : score >= 55 ? "Consider" : "Do Not Recommend";

      return {
        candidateId: candidate._id,
        rank: 0,
        matchScore: score,
        strengths: [
          `Matched ${matchedSkills.length} required skills`,
          `${candidate.yearsOfExperience} years of experience`,
          `Education: ${candidate.education}`,
        ],
        gaps: [
          matchedSkills.length < requiredSkills.size ? "Some required skills are missing" : "No major skill gaps",
          candidate.yearsOfExperience < input.job.minimumExperience
            ? "Experience is below minimum requirement"
            : "Experience meets requirement",
        ],
        explanation:
          `Fallback ranking generated due to temporary AI quota limits. Candidate scored ${score}/100 based on weighted skill, experience, education, and profile relevance fit.`,
        recommendation,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, input.topN)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return { shortlist };
};

export const runGeminiScreening = async (input: ScreeningPromptInput) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  // This single prompt evaluates all applicants in one request, matching the hackathon requirement.
  // JSON-only response constraints keep downstream parsing deterministic for production reliability.
  const prompt = `
${SYSTEM_PROMPT_FOR_SCREENING}

Important runtime constraints:
- Return only top ${input.topN} candidates.
- candidateId must be one of the exact applicant IDs provided.

JOB DESCRIPTION:
${JSON.stringify(input.job, null, 2)}

CANDIDATES:
${JSON.stringify(input.applicants, null, 2)}
`;

  const response = await model.generateContent(prompt);
  const text = response.response.text().trim();
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as {
    shortlist: Array<{
      candidateId: string;
      rank: number;
      matchScore: number;
      strengths: string[];
      gaps: string[];
      explanation: string;
      recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
    }>;
  };

  return parsed;
};
