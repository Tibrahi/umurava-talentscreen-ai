import { GoogleGenerativeAI } from "@google/generative-ai";

interface ScreeningPromptInput {
  job: {
    title: string;
    description: string;
    requiredSkills: string[];
    minimumExperience: number;
    education: string;
    location?: string;
    employmentType?: string;
  };
  applicants: Array<{
    _id: string;
    fullName: string;
    yearsOfExperience: number;
    education: string;
    skills: string[];
    summary?: string;
    resumeText?: string;
    structuredProfile?: Record<string, unknown>;
    profileData?: Record<string, unknown>;
  }>;
  topN: 10 | 20;
}

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Build a rich text representation of a single applicant's full profile
 * so Gemini can read it like a resume — not raw JSON.
 */
function buildApplicantSummaryText(applicant: ScreeningPromptInput["applicants"][0]): string {
  const sp = applicant.structuredProfile || {};
  const pd = applicant.profileData as Record<string, unknown> | undefined;
  const raw = (pd?.raw || {}) as Record<string, unknown>;

  function safeParse<T>(val: unknown): T[] {
    if (Array.isArray(val)) return val as T[];
    if (typeof val === "string") {
      try { return JSON.parse(val) as T[]; } catch { return []; }
    }
    return [];
  }

  function safeObj<T>(val: unknown): T | undefined {
    if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
    if (typeof val === "string") {
      try { return JSON.parse(val) as T; } catch { return undefined; }
    }
    return undefined;
  }

  const firstName = (sp.firstName || raw["First Name"] || "") as string;
  const lastName = (sp.lastName || raw["Last Name"] || "") as string;
  const fullName = `${firstName} ${lastName}`.trim() || applicant.fullName;
  const email = (sp.email || raw["Email"] || "") as string;
  const headline = (sp.headline || raw["Headline"] || applicant.summary || "") as string;
  const bio = (sp.bio || raw["Bio"] || "") as string;
  const location = (sp.location || raw["Location"] || "") as string;

  interface Skill { name?: string; level?: string; yearsOfExperience?: number; }
  interface LangItem { name?: string; proficiency?: string; }
  interface ExpItem { company?: string; role?: string; startDate?: string; endDate?: string; description?: string; technologies?: string[]; isCurrent?: boolean; }
  interface EduItem { institution?: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }
  interface CertItem { name?: string; issuer?: string; issueDate?: string; }
  interface ProjItem { name?: string; description?: string; technologies?: string[]; role?: string; }

  const skills = safeParse<Skill>(sp.skills || raw["skills"] || applicant.skills?.map((s) => ({ name: s })));
  const languages = safeParse<LangItem>(sp.languages || raw["languages"]);
  const experience = safeParse<ExpItem>(sp.experience || raw["experience"]);
  const education = safeParse<EduItem>(sp.education || raw["education"]);
  const certifications = safeParse<CertItem>(sp.certifications || raw["certifications"]);
  const projects = safeParse<ProjItem>(sp.projects || raw["projects"]);
  const availability = safeObj<{ status?: string; type?: string; startDate?: string }>(sp.availability || raw["availability"]);
  const socialLinks = safeObj<{ linkedin?: string; github?: string; portfolio?: string }>(sp.socialLinks || raw["socialLinks"]);

  // Calculate real experience years from entries
  let calcExpYears = applicant.yearsOfExperience || 0;
  if (calcExpYears === 0 && experience.length > 0) {
    const total = experience.reduce((acc, exp) => {
      const start = new Date(((exp.startDate || "") + "-01").slice(0, 10));
      const end =
        !exp.endDate || exp.endDate === "Present"
          ? new Date()
          : new Date((exp.endDate + "-01").slice(0, 10));
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
      return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    }, 0);
    calcExpYears = Math.round(total);
  }

  const lines: string[] = [];
  lines.push(`CANDIDATE ID: ${applicant._id}`);
  lines.push(`NAME: ${fullName}`);
  if (email) lines.push(`EMAIL: ${email}`);
  if (headline) lines.push(`HEADLINE: ${headline}`);
  if (bio) lines.push(`BIO: ${bio}`);
  if (location) lines.push(`LOCATION: ${location}`);
  lines.push(`TOTAL EXPERIENCE: ${calcExpYears} years`);

  if (skills.length > 0) {
    lines.push(`\nSKILLS:`);
    skills.forEach((s) => {
      lines.push(`  - ${s.name}${s.level ? ` (${s.level})` : ""}${s.yearsOfExperience ? `, ${s.yearsOfExperience} yrs` : ""}`);
    });
  }

  if (languages.length > 0) {
    lines.push(`\nLANGUAGES: ${languages.map((l) => `${l.name} [${l.proficiency || ""}]`).join(", ")}`);
  }

  if (experience.length > 0) {
    lines.push(`\nWORK EXPERIENCE:`);
    experience.forEach((exp) => {
      lines.push(`  - ${exp.role || "Role"} at ${exp.company || "Company"} (${exp.startDate || "?"} – ${exp.endDate || "Present"})`);
      if (exp.description) lines.push(`    ${exp.description}`);
      if (exp.technologies && exp.technologies.length > 0) {
        lines.push(`    Technologies: ${exp.technologies.join(", ")}`);
      }
    });
  }

  if (education.length > 0) {
    lines.push(`\nEDUCATION:`);
    education.forEach((e) => {
      lines.push(`  - ${e.degree || "Degree"} in ${e.fieldOfStudy || "Field"} at ${e.institution || "Institution"} (${e.startYear || "?"} – ${e.endYear || "Present"})`);
    });
  }

  if (certifications.length > 0) {
    lines.push(`\nCERTIFICATIONS:`);
    certifications.forEach((c) => {
      lines.push(`  - ${c.name}${c.issuer ? ` by ${c.issuer}` : ""}${c.issueDate ? ` (${c.issueDate})` : ""}`);
    });
  }

  if (projects.length > 0) {
    lines.push(`\nPROJECTS:`);
    projects.forEach((p) => {
      lines.push(`  - ${p.name || "Project"}${p.role ? ` (${p.role})` : ""}: ${p.description || ""}`);
      if (p.technologies && p.technologies.length > 0) {
        lines.push(`    Technologies: ${p.technologies.join(", ")}`);
      }
    });
  }

  if (availability) {
    lines.push(`\nAVAILABILITY: ${availability.status || "Unknown"}, ${availability.type || ""}${availability.startDate ? ` from ${availability.startDate}` : ""}`);
  }

  if (socialLinks) {
    const links = [
      socialLinks.linkedin && `LinkedIn: ${socialLinks.linkedin}`,
      socialLinks.github && `GitHub: ${socialLinks.github}`,
      socialLinks.portfolio && `Portfolio: ${socialLinks.portfolio}`,
    ].filter(Boolean);
    if (links.length > 0) lines.push(`LINKS: ${links.join(" | ")}`);
  }

  return lines.join("\n");
}

export const SYSTEM_PROMPT_FOR_SCREENING = `
You are a senior HR talent evaluation specialist at Umurava. You will receive a JOB DESCRIPTION and a list of ALL CANDIDATES in a structured text format. Your task is to evaluate all candidates simultaneously against the job and return a ranked shortlist.

EVALUATION CRITERIA (strictly follow these weights):
- Skills match vs required skills: 40%
- Experience relevance and years: 30%
- Education and certifications: 15%
- Overall profile quality and cultural fit: 15%

For EVERY candidate in your shortlist return ALL of these fields — use only information present in their profile, never invent:
- candidateId: exact ID provided
- rank: position in shortlist (1 = best)
- matchScore: 0-100 (be realistic and strict)
- strengths: exactly 3 specific points drawn from the profile
- gapsAndRisks: 1-3 honest gaps or missing requirements
- explanation: 2-3 sentences of professional assessment explaining why this candidate fits (or doesn't)
- recommendation: exactly one of "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend"

STRICT RULES:
- Evaluate ALL candidates at once, not sequentially
- Do not favour candidates based on gender, name, or nationality
- Only return top N candidates
- Return ONLY valid JSON — no markdown, no extra text, no code fences
- If a candidate is missing data, lower their score accordingly; do not guess

Return this exact JSON structure:
{
  "shortlist": [
    {
      "candidateId": "string",
      "rank": 1,
      "matchScore": 85,
      "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
      "gapsAndRisks": ["specific gap or risk"],
      "explanation": "Two to three sentence professional explanation.",
      "recommendation": "Recommend"
    }
  ]
}
`;

export interface ShortlistItem {
  candidateId: string;
  rank: number;
  matchScore: number;
  strengths: string[];
  gapsAndRisks: string[];
  explanation: string;
  recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
}

export const isGeminiQuotaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.toLowerCase().includes("quota exceeded");
};

/**
 * Heuristic fallback — uses same weighting model as the Gemini prompt.
 * Produces deterministic results without API calls.
 */
export const buildFallbackShortlist = (input: ScreeningPromptInput): { shortlist: ShortlistItem[] } => {
  const requiredSkills = new Set(input.job.requiredSkills.map((s) => s.toLowerCase().trim()));

  const shortlist = input.applicants
    .map((candidate) => {
      const sp = candidate.structuredProfile || {};
      const pd = candidate.profileData as Record<string, unknown> | undefined;
      const raw = (pd?.raw || {}) as Record<string, unknown>;

      function safeParse<T>(val: unknown): T[] {
        if (Array.isArray(val)) return val as T[];
        if (typeof val === "string") {
          try { return JSON.parse(val) as T[]; } catch { return []; }
        }
        return [];
      }

      const allSkills: { name?: string }[] = safeParse(sp.skills || raw["skills"] || candidate.skills?.map((s) => ({ name: s })));
      const expEntries: { startDate?: string; endDate?: string }[] = safeParse(sp.experience || raw["experience"]);
      const eduEntries: { degree?: string; institution?: string }[] = safeParse(sp.education || raw["education"]);
      const certEntries: { name?: string }[] = safeParse(sp.certifications || raw["certifications"]);

      const candidateSkillNames = allSkills.map((s) => (s.name || "").toLowerCase().trim());
      const matchedSkills = candidateSkillNames.filter((s) => requiredSkills.has(s));
      const skillScore = requiredSkills.size > 0 ? (matchedSkills.length / requiredSkills.size) * 40 : 20;

      // Real exp calculation
      let realYears = candidate.yearsOfExperience || 0;
      if (realYears === 0 && expEntries.length > 0) {
        const total = expEntries.reduce((acc, exp) => {
          const start = new Date(((exp.startDate || "") + "-01").slice(0, 10));
          const end = !exp.endDate || exp.endDate === "Present" ? new Date() : new Date((exp.endDate + "-01").slice(0, 10));
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
          return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
        }, 0);
        realYears = Math.round(total);
      }

      const expRatio = input.job.minimumExperience > 0 ? Math.min(realYears / input.job.minimumExperience, 1) : 1;
      const expScore = expRatio * 30;

      const eduStr = eduEntries.map((e) => `${e.degree || ""} ${e.institution || ""}`).join(" ").toLowerCase();
      const jobEduStr = (input.job.education || "").toLowerCase();
      const eduScore = eduStr.includes(jobEduStr) || jobEduStr.includes("bachelor") ? 15 : certEntries.length > 0 ? 12 : 7;

      const relevanceScore = candidate.summary?.length ? 15 : 8;
      const score = Math.round(Math.min(100, skillScore + expScore + eduScore + relevanceScore));

      const recommendation: ShortlistItem["recommendation"] =
        score >= 85 ? "Strongly Recommend" : score >= 70 ? "Recommend" : score >= 50 ? "Consider" : "Do Not Recommend";

      const missingSkills = input.job.requiredSkills.filter((s) => !candidateSkillNames.includes(s.toLowerCase()));

      return {
        candidateId: candidate._id,
        rank: 0,
        matchScore: score,
        strengths: [
          `Matched ${matchedSkills.length} of ${requiredSkills.size} required skills: ${matchedSkills.slice(0, 3).join(", ") || "none"}`,
          `${realYears} years of professional experience`,
          eduEntries.length > 0 ? `Education: ${eduEntries[0].degree} from ${eduEntries[0].institution}` : certEntries.length > 0 ? `Holds ${certEntries.length} certification(s)` : "Profile available for review",
        ],
        gapsAndRisks: missingSkills.length > 0
          ? [`Missing required skills: ${missingSkills.slice(0, 3).join(", ")}`]
          : realYears < input.job.minimumExperience
          ? [`Experience (${realYears}y) below minimum requirement (${input.job.minimumExperience}y)`]
          : ["No major gaps identified (fallback scoring)"],
        explanation: `Fallback score generated (Gemini quota unavailable). Candidate scored ${score}/100 based on skill match, experience, education, and profile completeness. Manual review recommended.`,
        recommendation,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, input.topN)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return { shortlist };
};

/**
 * Main Gemini screening function.
 * Sends ONE prompt with ALL applicants + job to evaluate together.
 * This avoids quota issues from per-applicant calls.
 */
export const runGeminiScreening = async (input: ScreeningPromptInput): Promise<{ shortlist: ShortlistItem[] }> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  // Build rich resume-like text for every applicant
  const candidateTexts = input.applicants
    .map((a, i) => `--- CANDIDATE ${i + 1} ---\n${buildApplicantSummaryText(a)}`)
    .join("\n\n");

  const jobText = `
JOB TITLE: ${input.job.title}
LOCATION: ${input.job.location || "Not specified"}
EMPLOYMENT TYPE: ${input.job.employmentType || "Not specified"}
MINIMUM EXPERIENCE: ${input.job.minimumExperience} years
EDUCATION REQUIREMENT: ${input.job.education}
REQUIRED SKILLS: ${input.job.requiredSkills.join(", ")}
DESCRIPTION:
${input.job.description}
`.trim();

  const prompt = `
${SYSTEM_PROMPT_FOR_SCREENING}

Return only the top ${input.topN} candidates.

=== JOB DESCRIPTION ===
${jobText}

=== ALL CANDIDATES (${input.applicants.length} total) ===
${candidateTexts}
`.trim();

  const response = await model.generateContent(prompt);
  const text = response.response.text().trim();

  // Clean any accidental markdown fences
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as { shortlist: ShortlistItem[] };
  return parsed;
};