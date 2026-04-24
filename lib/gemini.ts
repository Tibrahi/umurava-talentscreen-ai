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
 * Build a rich, clearly-delimited text block for one applicant.
 * Every section is explicitly labeled and "NONE PROVIDED" is written
 * for empty sections — this forces the model to score those dimensions
 * as 0 rather than guessing.
 */
function buildApplicantSummaryText(applicant: ScreeningPromptInput["applicants"][0]): string {
  const sp  = applicant.structuredProfile || {};
  const pd  = applicant.profileData as Record<string, unknown> | undefined;
  const raw = (pd?.raw || {}) as Record<string, unknown>;

  function safeParse<T>(val: unknown): T[] {
    if (Array.isArray(val)) return val as T[];
    if (typeof val === "string") { try { return JSON.parse(val) as T[]; } catch { return []; } }
    return [];
  }
  function safeObj<T>(val: unknown): T | undefined {
    if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
    if (typeof val === "string") { try { return JSON.parse(val) as T; } catch { return undefined; } }
    return undefined;
  }

  const firstName  = (sp.firstName  || raw["First Name"] || "") as string;
  const lastName   = (sp.lastName   || raw["Last Name"]  || "") as string;
  const fullName   = `${firstName} ${lastName}`.trim() || applicant.fullName;
  const email      = (sp.email      || raw["Email"]      || "") as string;
  const headline   = (sp.headline   || raw["Headline"]   || applicant.summary || "") as string;
  const bio        = (sp.bio        || raw["Bio"]        || "") as string;
  const location   = (sp.location   || raw["Location"]   || "") as string;

  interface Skill { name?: string; level?: string; yearsOfExperience?: number; }
  interface Lang  { name?: string; proficiency?: string; }
  interface Exp   { company?: string; role?: string; startDate?: string; endDate?: string; description?: string; technologies?: string[]; }
  interface Edu   { institution?: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number; }
  interface Cert  { name?: string; issuer?: string; issueDate?: string; }
  interface Proj  { name?: string; description?: string; technologies?: string[]; role?: string; }

  const skills         = safeParse<Skill>(sp.skills         || raw["skills"]         || applicant.skills?.map((s) => ({ name: s })));
  const languages      = safeParse<Lang>(sp.languages       || raw["languages"]);
  const experience     = safeParse<Exp>(sp.experience       || raw["experience"]);
  const education      = safeParse<Edu>(sp.education        || raw["education"]);
  const certifications = safeParse<Cert>(sp.certifications  || raw["certifications"]);
  const projects       = safeParse<Proj>(sp.projects        || raw["projects"]);
  const availability   = safeObj<{ status?: string; type?: string; startDate?: string }>(sp.availability || raw["availability"]);
  const socialLinks    = safeObj<{ linkedin?: string; github?: string; portfolio?: string }>(sp.socialLinks || raw["socialLinks"]);

  // Compute real experience from date entries
  let calcExpYears = 0;
  if (experience.length > 0) {
    const total = experience.reduce((acc, exp) => {
      const start = new Date(((exp.startDate || "") + "-01").slice(0, 10));
      const end   = !exp.endDate || exp.endDate === "Present"
        ? new Date()
        : new Date((exp.endDate + "-01").slice(0, 10));
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
      return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    }, 0);
    calcExpYears = Math.round(total * 10) / 10;
  } else if (applicant.yearsOfExperience > 0) {
    calcExpYears = applicant.yearsOfExperience;
  }

  const lines: string[] = [];
  lines.push(`CANDIDATE_ID: ${applicant._id}`);
  lines.push(`NAME: ${fullName}`);
  lines.push(`EMAIL: ${email || "NONE PROVIDED"}`);
  lines.push(`HEADLINE: ${headline || "NONE PROVIDED"}`);
  lines.push(`BIO: ${bio || "NONE PROVIDED"}`);
  lines.push(`LOCATION: ${location || "NONE PROVIDED"}`);
  lines.push(`CALCULATED_EXPERIENCE_YEARS: ${calcExpYears} (derived from work history dates above)`);

  if (skills.length > 0) {
    lines.push(`\nSKILLS [${skills.length} listed — use these for exact skill matching]:`);
    skills.forEach((s) => {
      const parts = [`${s.name || "?"}`];
      if (s.level)             parts.push(`level=${s.level}`);
      if (s.yearsOfExperience) parts.push(`yrs=${s.yearsOfExperience}`);
      lines.push(`  · ${parts.join(", ")}`);
    });
  } else {
    lines.push(`\nSKILLS: NONE PROVIDED — score skillsScore as 0`);
  }

  if (languages.length > 0) {
    lines.push(`\nLANGUAGES: ${languages.map((l) => `${l.name} (${l.proficiency || "not stated"})`).join(" | ")}`);
  } else {
    lines.push(`\nLANGUAGES: NONE PROVIDED`);
  }

  if (experience.length > 0) {
    lines.push(`\nWORK EXPERIENCE [${experience.length} role(s) — cross-check with CALCULATED_EXPERIENCE_YEARS]:`);
    experience.forEach((exp, i) => {
      lines.push(`  [${i + 1}] ${exp.role || "?"} at ${exp.company || "?"} | ${exp.startDate || "?"} → ${exp.endDate || "Present"}`);
      if (exp.description)                                   lines.push(`       ${exp.description}`);
      if (exp.technologies && exp.technologies.length > 0)   lines.push(`       Tech used: ${exp.technologies.join(", ")}`);
    });
  } else {
    lines.push(`\nWORK EXPERIENCE: NONE PROVIDED — score experienceScore as 0`);
  }

  if (education.length > 0) {
    lines.push(`\nEDUCATION [${education.length}]:`);
    education.forEach((e, i) => {
      lines.push(`  [${i + 1}] ${e.degree || "?"} | Field: ${e.fieldOfStudy || "?"} | ${e.institution || "?"} | ${e.startYear || "?"} – ${e.endYear || "Present"}`);
    });
  } else {
    lines.push(`\nEDUCATION: NONE PROVIDED — score educationScore as 0`);
  }

  if (certifications.length > 0) {
    lines.push(`\nCERTIFICATIONS [${certifications.length}]:`);
    certifications.forEach((c) => lines.push(`  · ${c.name || "?"}${c.issuer ? ` — ${c.issuer}` : ""}${c.issueDate ? ` (${c.issueDate})` : ""}`));
  } else {
    lines.push(`\nCERTIFICATIONS: NONE PROVIDED`);
  }

  if (projects.length > 0) {
    lines.push(`\nPROJECTS [${projects.length}]:`);
    projects.forEach((p) => {
      lines.push(`  · ${p.name || "?"}${p.role ? ` (${p.role})` : ""}: ${p.description || ""}`);
      if (p.technologies && p.technologies.length > 0) lines.push(`    Tech: ${p.technologies.join(", ")}`);
    });
  } else {
    lines.push(`\nPROJECTS: NONE PROVIDED`);
  }

  if (availability) {
    lines.push(`\nAVAILABILITY: ${availability.status || "?"}, ${availability.type || "?"}${availability.startDate ? `, from ${availability.startDate}` : ""}`);
  }

  if (socialLinks) {
    const links = [
      socialLinks.linkedin  && `LinkedIn: ${socialLinks.linkedin}`,
      socialLinks.github    && `GitHub: ${socialLinks.github}`,
      socialLinks.portfolio && `Portfolio: ${socialLinks.portfolio}`,
    ].filter(Boolean);
    if (links.length) lines.push(`\nSOCIAL LINKS: ${links.join(" | ")}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// System prompt — evidence-based, anti-hallucination, sub-score breakdown
// ---------------------------------------------------------------------------
export const SYSTEM_PROMPT_FOR_SCREENING = `
You are a senior HR talent evaluator at Umurava.
Your ONLY job is to score candidates based on EXPLICITLY STATED information in their profile block.
You must NEVER infer, guess, assume, or extrapolate.

════════════════════════════════════════════════════════
ANTI-HALLUCINATION RULES — MANDATORY, NO EXCEPTIONS
════════════════════════════════════════════════════════
1. SKILLS: Count a required skill as "matched" ONLY if its exact name (or a universally accepted abbreviation, e.g. "JS" ↔ "JavaScript") appears in the candidate's SKILLS section. Do NOT infer skills from job titles, company names, or project tech stacks.
2. EXPERIENCE: Use the CALCULATED_EXPERIENCE_YEARS field. Never estimate from company prestige or job title seniority.
3. EDUCATION: Reference only the EDUCATION section. "NONE PROVIDED" means educationScore = 0.
4. CERTIFICATIONS: Only count what appears in the CERTIFICATIONS section.
5. If a section says "NONE PROVIDED", score that dimension = 0 with no exceptions.
6. Every strength MUST directly reference a specific field in the profile (quote or field name).
7. Every gap MUST name exactly which required element is absent from the profile.

════════════════════════════════════════════════════════
SCORING FORMULA — APPLY MATHEMATICALLY, SHOW WORK
════════════════════════════════════════════════════════
skillsScore (0–40):
  matched = count required skills found verbatim in SKILLS section
  skillsScore = round((matched / total_required_skills) × 40)
  [NONE PROVIDED → 0]

experienceScore (0–30):
  ratio = min(CALCULATED_EXPERIENCE_YEARS / minimumExperience, 1.0)
  experienceScore = round(ratio × 30)
  [WORK EXPERIENCE = NONE PROVIDED AND CALCULATED_EXPERIENCE_YEARS = 0 → 0]

educationScore (0–15):
  15 = degree field matches requirement closely
  10 = related STEM/business field
   5 = unrelated but some degree present
   0 = EDUCATION = NONE PROVIDED

completenessScore (0–15):
  count how many of these are present (not "NONE PROVIDED"):
  SKILLS, WORK EXPERIENCE, EDUCATION, BIO or HEADLINE
  4 present → 15 | 3 → 10 | 2 → 5 | 0–1 → 0

matchScore = skillsScore + experienceScore + educationScore + completenessScore

recommendation:
  matchScore ≥ 85 → "Strongly Recommend"
  matchScore ≥ 70 → "Recommend"
  matchScore ≥ 50 → "Consider"
  matchScore < 50  → "Do Not Recommend"

════════════════════════════════════════════════════════
OUTPUT — RETURN ONLY THIS JSON, NOTHING ELSE
════════════════════════════════════════════════════════
{
  "shortlist": [
    {
      "candidateId": "<exact CANDIDATE_ID from profile>",
      "rank": 1,
      "matchScore": 78,
      "skillsScore": 32,
      "experienceScore": 24,
      "educationScore": 12,
      "completenessScore": 10,
      "matchedSkills": ["exact skill names from SKILLS section"],
      "missingSkills": ["required skills not found in SKILLS section"],
      "strengths": [
        "Cite exact evidence e.g. 'Node.js listed in SKILLS section (Advanced, 3 yrs)'",
        "Cite exact evidence e.g. 'Backend Engineer at MTN Rwanda 2022-01 → Present (≈3 yrs)'",
        "Cite exact evidence e.g. 'Bachelor in CS from University of Rwanda 2018–2022'"
      ],
      "gapsAndRisks": [
        "Required skill 'GraphQL' not found in SKILLS section"
      ],
      "explanation": "2–3 sentences citing specific profile fields. No guessing. No inferences.",
      "recommendation": "Recommend"
    }
  ]
}
`;

// ---------------------------------------------------------------------------
// Types — updated to include sub-scores
// ---------------------------------------------------------------------------
export interface ShortlistItem {
  candidateId: string;
  rank: number;
  matchScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  completenessScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gapsAndRisks: string[];
  explanation: string;
  recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
}

export const isGeminiQuotaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.toLowerCase().includes("quota exceeded");
};

// ---------------------------------------------------------------------------
// Heuristic fallback — mirrors the exact same math as the system prompt
// ---------------------------------------------------------------------------
export const buildFallbackShortlist = (input: ScreeningPromptInput): { shortlist: ShortlistItem[] } => {
  const requiredSkillsLower = input.job.requiredSkills.map((s) => s.toLowerCase().trim());

  const shortlist = input.applicants
    .map((candidate) => {
      const sp  = candidate.structuredProfile || {};
      const pd  = candidate.profileData as Record<string, unknown> | undefined;
      const raw = (pd?.raw || {}) as Record<string, unknown>;

      function safeParse<T>(val: unknown): T[] {
        if (Array.isArray(val)) return val as T[];
        if (typeof val === "string") { try { return JSON.parse(val) as T[]; } catch { return []; } }
        return [];
      }

      const allSkills:   { name?: string }[]                                            = safeParse(sp.skills        || raw["skills"]        || candidate.skills?.map((s) => ({ name: s })));
      const expEntries:  { startDate?: string; endDate?: string }[]                     = safeParse(sp.experience    || raw["experience"]);
      const eduEntries:  { degree?: string; institution?: string; fieldOfStudy?: string }[] = safeParse(sp.education || raw["education"]);
      const certEntries: { name?: string }[]                                            = safeParse(sp.certifications || raw["certifications"]);
      const bio = ((sp.bio || sp.headline || candidate.summary || "") as string).trim();

      // Skills
      const candidateSkillNamesLower = allSkills.map((s) => (s.name || "").toLowerCase().trim());
      const matchedLower   = requiredSkillsLower.filter((s) => candidateSkillNamesLower.includes(s));
      const matchedDisplay = matchedLower.map((s) => input.job.requiredSkills.find((r) => r.toLowerCase() === s) || s);
      const missingDisplay = requiredSkillsLower.filter((s) => !candidateSkillNamesLower.includes(s))
        .map((s) => input.job.requiredSkills.find((r) => r.toLowerCase() === s) || s);
      const skillsScore = requiredSkillsLower.length > 0
        ? Math.round((matchedLower.length / requiredSkillsLower.length) * 40) : 0;

      // Experience
      let realYears = 0;
      if (expEntries.length > 0) {
        const total = expEntries.reduce((acc, exp) => {
          const start = new Date(((exp.startDate || "") + "-01").slice(0, 10));
          const end   = !exp.endDate || exp.endDate === "Present" ? new Date() : new Date((exp.endDate + "-01").slice(0, 10));
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
          return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
        }, 0);
        realYears = Math.round(total * 10) / 10;
      } else if (candidate.yearsOfExperience > 0) {
        realYears = candidate.yearsOfExperience;
      }
      const req = input.job.minimumExperience;
      const expRatio = req > 0 ? Math.min(realYears / req, 1) : 1;
      const experienceScore = expEntries.length === 0 && realYears === 0 ? 0 : Math.round(expRatio * 30);

      // Education
      const jobEdu  = (input.job.education || "").toLowerCase();
      const eduText = eduEntries.map((e) => `${e.degree || ""} ${e.fieldOfStudy || ""} ${e.institution || ""}`).join(" ").toLowerCase();
      const educationScore = eduEntries.length === 0
        ? 0
        : (eduText.includes(jobEdu) || jobEdu.split(" ").some((w) => w.length > 3 && eduText.includes(w)))
          ? 15 : 5;

      // Completeness
      const sectionsPresent = [
        allSkills.length > 0,
        expEntries.length > 0,
        eduEntries.length > 0,
        bio.length > 0,
      ].filter(Boolean).length;
      const completenessScore = sectionsPresent >= 4 ? 15 : sectionsPresent === 3 ? 10 : sectionsPresent === 2 ? 5 : 0;

      const matchScore = Math.min(100, skillsScore + experienceScore + educationScore + completenessScore);
      const recommendation: ShortlistItem["recommendation"] =
        matchScore >= 85 ? "Strongly Recommend"
        : matchScore >= 70 ? "Recommend"
        : matchScore >= 50 ? "Consider"
        : "Do Not Recommend";

      return {
        candidateId: candidate._id,
        rank: 0,
        matchScore,
        skillsScore,
        experienceScore,
        educationScore,
        completenessScore,
        matchedSkills: matchedDisplay,
        missingSkills: missingDisplay,
        strengths: [
          matchedDisplay.length > 0
            ? `${matchedDisplay.length}/${requiredSkillsLower.length} required skills found in SKILLS section: ${matchedDisplay.slice(0, 3).join(", ")}`
            : "No required skills found in SKILLS section",
          expEntries.length > 0
            ? `${realYears} yrs calculated from ${expEntries.length} WORK EXPERIENCE entry(ies)`
            : realYears > 0
              ? `${realYears} yrs from stored profile (no dated entries to verify)`
              : "WORK EXPERIENCE section is NONE PROVIDED",
          eduEntries.length > 0
            ? `EDUCATION: ${eduEntries[0].degree || "?"} in ${eduEntries[0].fieldOfStudy || "?"} from ${eduEntries[0].institution || "?"}`
            : certEntries.length > 0
              ? `CERTIFICATIONS: ${certEntries.map((c) => c.name).join(", ")}`
              : "EDUCATION and CERTIFICATIONS sections are NONE PROVIDED",
        ],
        gapsAndRisks: [
          ...(missingDisplay.length > 0
            ? [`Required skill(s) not found in SKILLS section: ${missingDisplay.slice(0, 4).join(", ")}`]
            : []),
          ...(realYears < req && req > 0
            ? [`CALCULATED_EXPERIENCE_YEARS (${realYears}) below minimum requirement (${req})`]
            : []),
          ...(eduEntries.length === 0 && certEntries.length === 0
            ? ["EDUCATION section is NONE PROVIDED — educationScore = 0"]
            : []),
        ].filter(Boolean).slice(0, 3),
        explanation: `Heuristic score (Gemini API unavailable). Skills: ${skillsScore}/40 (${matchedDisplay.length}/${requiredSkillsLower.length} matched). Experience: ${experienceScore}/30 (${realYears}y vs ${req}y required). Education: ${educationScore}/15. Completeness: ${completenessScore}/15. Manual verification strongly recommended.`,
        recommendation,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, input.topN)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return { shortlist };
};

// ---------------------------------------------------------------------------
// Main Gemini call — one batched prompt for all applicants
// ---------------------------------------------------------------------------
export const runGeminiScreening = async (
  input: ScreeningPromptInput
): Promise<{ shortlist: ShortlistItem[] }> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,   // low temp = factual, not creative
      topP: 0.85,
      maxOutputTokens: 8192,
    },
  });

  const sep = "═".repeat(64);

  const candidateTexts = input.applicants
    .map((a, i) => `${sep}\nCANDIDATE ${i + 1} OF ${input.applicants.length}\n${sep}\n${buildApplicantSummaryText(a)}`)
    .join("\n\n");

  const jobText = [
    `JOB TITLE: ${input.job.title}`,
    `LOCATION: ${input.job.location || "Not specified"}`,
    `EMPLOYMENT TYPE: ${input.job.employmentType || "Not specified"}`,
    `MINIMUM EXPERIENCE (years): ${input.job.minimumExperience}`,
    `EDUCATION REQUIREMENT: ${input.job.education}`,
    `REQUIRED SKILLS [${input.job.requiredSkills.length} — match these against each candidate's SKILLS section]:\n  ${input.job.requiredSkills.join("\n  ")}`,
    `\nJOB DESCRIPTION:\n${input.job.description}`,
  ].join("\n");

  const prompt = `${SYSTEM_PROMPT_FOR_SCREENING}

Evaluate all ${input.applicants.length} candidates below and return the top ${input.topN} by matchScore.

${sep}
JOB SPECIFICATION
${sep}
${jobText}

${sep}
ALL CANDIDATES — PROFILE DATA ONLY (no inferences outside these blocks)
${sep}
${candidateTexts}`.trim();

  const response = await model.generateContent(prompt);
  const text = response.response.text().trim();

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i,    "")
    .replace(/```$/i,        "")
    .trim();

  return JSON.parse(cleaned) as { shortlist: ShortlistItem[] };
};