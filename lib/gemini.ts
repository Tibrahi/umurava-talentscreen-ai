/**
 * Umurava AI — Candidate Screening Engine
 *
 * Architecture (two-layer, anti-hallucination):
 * ─────────────────────────────────────────────
 * Layer 1 — Deterministic Scorer (TypeScript, no AI)
 *   • Reads structuredProfile from real Atlas documents
 *   • Computes all numeric scores mathematically
 *   • Produces matchedSkills / missingSkills / recommendation
 *   • This layer is the source of truth — Gemini cannot change any number
 *
 * Layer 2 — Narrative Writer (Gemini 2.0 Flash)
 *   • Receives pre-computed scores as immutable facts
 *   • Is ONLY asked to write explanation, strengths[], gapsAndRisks[]
 *   • Prompt explicitly forbids inventing or modifying scores
 *   • On quota / network failure → template fallback (no Gemini needed)
 *
 * Result: every score is grounded in real MongoDB data. Gemini can only
 * colour the narrative, never manufacture a number.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────

export interface ScreeningInput {
  job: {
    title: string;
    description: string;
    requiredSkills: string[];
    minimumExperience: number;
    education: string;
    location?: string;
    employmentType?: string;
  };
  applicants: ApplicantInput[];
  topN: 10 | 20;
}

export interface ApplicantInput {
  _id: string;
  fullName: string;
  email?: string;
  yearsOfExperience: number;
  education: string;
  skills: string[];
  summary?: string;
  structuredProfile?: Record<string, unknown>;
  profileData?: Record<string, unknown>;
}

export interface ShortlistItem {
  candidateId: string;
  rank: number;

  // Scores — set by deterministic layer, never by Gemini
  matchScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  completenessScore: number;

  // Evidence — derived from real Atlas fields
  matchedSkills: string[];
  missingSkills: string[];
  calculatedExperienceYears: number;

  // Narrative — written by Gemini (or fallback template)
  explanation: string;
  strengths: string[];
  gapsAndRisks: string[];

  recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
  scoredBy: "deterministic+gemini" | "deterministic+fallback";
}

// ─────────────────────────────────────────────────────────────
// Internal profile-extraction helpers
// ─────────────────────────────────────────────────────────────

type SkillEntry   = { name?: string; level?: string; yearsOfExperience?: number };
type ExpEntry     = { company?: string; role?: string; startDate?: string; endDate?: string; description?: string; technologies?: string[] };
type EduEntry     = { institution?: string; degree?: string; fieldOfStudy?: string; startYear?: number; endYear?: number };
type CertEntry    = { name?: string; issuer?: string; issueDate?: string };
type ProjEntry    = { name?: string; description?: string; technologies?: string[]; role?: string };
type Availability = { status?: string; type?: string; startDate?: string };
type SocialLinks  = { linkedin?: string; github?: string; portfolio?: string };

function parseArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try { return JSON.parse(val) as T[]; } catch { return []; }
  }
  return [];
}
function parseObj<T>(val: unknown): T | undefined {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return undefined; }
  }
  return undefined;
}

/** Extract a fully-normalised profile from whichever fields are present on the applicant document */
function extractProfile(a: ApplicantInput) {
  const sp  = (a.structuredProfile || {}) as Record<string, unknown>;
  const raw = ((a.profileData as Record<string, unknown> | undefined)?.raw || {}) as Record<string, unknown>;

  const firstName = ((sp.firstName || raw["First Name"] || "") as string).trim();
  const lastName  = ((sp.lastName  || raw["Last Name"]  || "") as string).trim();
  const fullName  = [firstName, lastName].filter(Boolean).join(" ") || a.fullName;
  const email     = ((sp.email    || raw["Email"]       || a.email || "") as string).trim();
  const headline  = ((sp.headline || raw["Headline"]    || a.summary || "") as string).trim();
  const bio       = ((sp.bio      || raw["Bio"]         || "") as string).trim();
  const location  = ((sp.location || raw["Location"]    || "") as string).trim();

  const skills         = parseArray<SkillEntry>(sp.skills         || raw["skills"]         || a.skills?.map((s) => ({ name: s })));
  const languages      = parseArray<{ name?: string; proficiency?: string }>(sp.languages  || raw["languages"]);
  const experience     = parseArray<ExpEntry>(sp.experience        || raw["experience"]);
  const education      = parseArray<EduEntry>(sp.education         || raw["education"]);
  const certifications = parseArray<CertEntry>(sp.certifications   || raw["certifications"]);
  const projects       = parseArray<ProjEntry>(sp.projects         || raw["projects"]);
  const availability   = parseObj<Availability>(sp.availability    || raw["availability"]);
  const socialLinks    = parseObj<SocialLinks>(sp.socialLinks      || raw["socialLinks"]);

  return { fullName, email, headline, bio, location, skills, languages, experience, education, certifications, projects, availability, socialLinks };
}

/** Calculate total years of experience from dated work entries, falling back to stored field */
function calcExperienceYears(experience: ExpEntry[], fallbackYears: number): number {
  if (experience.length === 0) return fallbackYears;
  const total = experience.reduce((acc, exp) => {
    const start = new Date(((exp.startDate || "") + "-01").slice(0, 10));
    const end   = !exp.endDate || exp.endDate === "Present"
      ? new Date()
      : new Date(((exp.endDate) + "-01").slice(0, 10));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
    return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, 0);
  return Math.round(total * 10) / 10;
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Deterministic Scorer
// ─────────────────────────────────────────────────────────────

interface DeterministicResult {
  candidateId: string;
  profile: ReturnType<typeof extractProfile>;
  matchScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  completenessScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  calculatedExperienceYears: number;
  recommendation: ShortlistItem["recommendation"];
}

function scoreApplicant(
  applicant: ApplicantInput,
  job: ScreeningInput["job"]
): DeterministicResult {
  const profile = extractProfile(applicant);
  const { skills, experience, education, certifications, bio, headline } = profile;

  // ── Skills score (0–40) ──────────────────────────────────
  const requiredLower  = job.requiredSkills.map((s) => s.toLowerCase().trim());
  const candidateLower = skills.map((s) => (s.name || "").toLowerCase().trim());

  // Exact match + common abbreviation aliases
  const ALIASES: Record<string, string[]> = {
    javascript: ["js"],
    typescript: ["ts"],
    "node.js": ["node", "nodejs"],
    "react.js": ["react", "reactjs"],
    "vue.js": ["vue", "vuejs"],
    postgresql: ["postgres", "pg"],
    mongodb: ["mongo"],
    kubernetes: ["k8s"],
  };

  function isSkillMatch(required: string, candidate: string): boolean {
    if (required === candidate) return true;
    const aliases = ALIASES[required] || [];
    if (aliases.includes(candidate)) return true;
    const reverseAliases = Object.entries(ALIASES).find(([, v]) => v.includes(required));
    if (reverseAliases && reverseAliases[0] === candidate) return true;
    return false;
  }

  const matchedOriginal: string[] = [];
  const missingOriginal: string[] = [];

  for (const req of requiredLower) {
    const matched = candidateLower.some((c) => isSkillMatch(req, c));
    const display = job.requiredSkills.find((s) => s.toLowerCase().trim() === req) || req;
    if (matched) matchedOriginal.push(display);
    else missingOriginal.push(display);
  }

  const skillsScore = requiredLower.length > 0
    ? Math.round((matchedOriginal.length / requiredLower.length) * 40)
    : 0;

  // ── Experience score (0–30) ──────────────────────────────
  const realYears   = calcExperienceYears(experience, applicant.yearsOfExperience);
  const req         = job.minimumExperience;
  const expRatio    = req > 0 ? Math.min(realYears / req, 1.0) : 1.0;
  const experienceScore = (experience.length === 0 && realYears === 0)
    ? 0
    : Math.round(expRatio * 30);

  // ── Education score (0–15) ───────────────────────────────
  const jobEduLower = job.education.toLowerCase();
  const eduText     = education
    .map((e) => `${e.degree || ""} ${e.fieldOfStudy || ""} ${e.institution || ""}`)
    .join(" ")
    .toLowerCase();

  let educationScore = 0;
  if (education.length > 0) {
    const keywordHit = jobEduLower.split(/\s+/).some((w) => w.length > 3 && eduText.includes(w));
    educationScore = (eduText.includes(jobEduLower) || keywordHit) ? 15 : 5;
  } else if (certifications.length > 0) {
    educationScore = 5; // certifications partially compensate for missing edu
  }

  // ── Completeness score (0–15) ────────────────────────────
  const sections = [
    skills.length > 0,
    experience.length > 0,
    education.length > 0,
    (bio + headline).length > 0,
  ].filter(Boolean).length;
  const completenessScore = sections >= 4 ? 15 : sections === 3 ? 10 : sections === 2 ? 5 : 0;

  const matchScore = Math.min(100, skillsScore + experienceScore + educationScore + completenessScore);

  const recommendation: ShortlistItem["recommendation"] =
    matchScore >= 85 ? "Strongly Recommend"
    : matchScore >= 70 ? "Recommend"
    : matchScore >= 50 ? "Consider"
    : "Do Not Recommend";

  return {
    candidateId: applicant._id,
    profile,
    matchScore,
    skillsScore,
    experienceScore,
    educationScore,
    completenessScore,
    matchedSkills: matchedOriginal,
    missingSkills: missingOriginal,
    calculatedExperienceYears: realYears,
    recommendation,
  };
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Narrative template fallback (no Gemini needed)
// ─────────────────────────────────────────────────────────────

function buildTemplateNarrative(
  scored: DeterministicResult,
  job: ScreeningInput["job"]
): Pick<ShortlistItem, "explanation" | "strengths" | "gapsAndRisks"> {
  const { profile, matchedSkills, missingSkills, calculatedExperienceYears, skillsScore, experienceScore, educationScore } = scored;
  const { skills, experience, education, certifications } = profile;

  const strengths: string[] = [];
  const gapsAndRisks: string[] = [];

  if (matchedSkills.length > 0) {
    strengths.push(
      `${matchedSkills.length} of ${job.requiredSkills.length} required skill(s) confirmed in SKILLS section: ${matchedSkills.slice(0, 4).join(", ")}${matchedSkills.length > 4 ? "…" : ""}`
    );
  }
  if (experience.length > 0) {
    const latest = experience[0];
    strengths.push(
      `${calculatedExperienceYears} yr(s) calculated from ${experience.length} work entry(ies)` +
      (latest ? ` — most recent: ${latest.role || "?"} at ${latest.company || "?"}` : "")
    );
  } else if (calculatedExperienceYears > 0) {
    strengths.push(`${calculatedExperienceYears} yr(s) of experience from stored profile`);
  }
  if (education.length > 0) {
    const e = education[0];
    strengths.push(`Education: ${e.degree || "?"} in ${e.fieldOfStudy || "?"} from ${e.institution || "?"}`);
  } else if (certifications.length > 0) {
    strengths.push(`Certifications present: ${certifications.map((c) => c.name).join(", ")}`);
  }

  if (missingSkills.length > 0) {
    gapsAndRisks.push(`Required skill(s) absent from SKILLS section: ${missingSkills.slice(0, 4).join(", ")}`);
  }
  if (calculatedExperienceYears < job.minimumExperience && job.minimumExperience > 0) {
    gapsAndRisks.push(
      `Experience ${calculatedExperienceYears} yr(s) is below the ${job.minimumExperience}-yr minimum`
    );
  }
  if (education.length === 0 && certifications.length === 0) {
    gapsAndRisks.push("No education or certifications found in profile");
  }

  const explanation = [
    `Skills: ${skillsScore}/40 (${matchedSkills.length}/${job.requiredSkills.length} matched).`,
    `Experience: ${experienceScore}/30 (${calculatedExperienceYears} yr(s) vs ${job.minimumExperience} required).`,
    `Education: ${educationScore}/15.`,
    gapsAndRisks.length > 0
      ? `Key gap(s): ${gapsAndRisks[0]}.`
      : "No critical gaps identified.",
    "Scores derived from MongoDB structured profile data.",
  ].join(" ");

  return { explanation, strengths, gapsAndRisks };
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Gemini narrative prompt (scores are immutable facts)
// ─────────────────────────────────────────────────────────────

const NARRATIVE_SYSTEM_PROMPT = `
You are a senior HR talent evaluator writing structured analysis for a recruitment platform.

You will receive a list of candidates whose scores have ALREADY been computed by a deterministic algorithm
from real database records. Your ONLY task is to write high-quality narrative for each candidate.

══════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
══════════════════════════════════════════════════
1. DO NOT invent, change, or contradict any provided score (matchScore, skillsScore, etc.)
2. DO NOT add skills, experience, or education that are not listed in the provided profile data
3. Every strength MUST reference an explicit field in the profile (name the source)
4. Every gap MUST name the specific missing requirement
5. explanation: 2–3 sentences, factual, cite profile fields
6. strengths: 2–4 items, concrete evidence-based statements
7. gapsAndRisks: only real gaps visible in the data (0 items is valid if no gaps)
══════════════════════════════════════════════════

Return ONLY this JSON — no markdown, no preamble:
{
  "narratives": [
    {
      "candidateId": "<exact id>",
      "explanation": "...",
      "strengths": ["...", "..."],
      "gapsAndRisks": ["..."]
    }
  ]
}
`.trim();

function buildNarrativePrompt(scored: DeterministicResult[], job: ScreeningInput["job"]): string {
  const sep = "─".repeat(60);
  const candidateBlocks = scored.map((s, i) => {
    const { profile, matchScore, skillsScore, experienceScore, educationScore, completenessScore,
            matchedSkills, missingSkills, calculatedExperienceYears, recommendation } = s;

    const lines = [
      `CANDIDATE ${i + 1}: ${profile.fullName} (ID: ${s.candidateId})`,
      `──── PRE-COMPUTED SCORES (immutable — do NOT change) ────`,
      `  matchScore=${matchScore}  skills=${skillsScore}/40  exp=${experienceScore}/30  edu=${educationScore}/15  completeness=${completenessScore}/15`,
      `  recommendation="${recommendation}"`,
      `  matchedSkills=[${matchedSkills.join(", ") || "none"}]`,
      `  missingSkills=[${missingSkills.join(", ") || "none"}]`,
      `  calculatedExperience=${calculatedExperienceYears} yrs`,
      `──── PROFILE DATA (reference only) ────`,
      `  headline: ${profile.headline || "NONE"}`,
      `  location: ${profile.location || "NONE"}`,
    ];

    if (profile.experience.length > 0) {
      lines.push(`  experience (${profile.experience.length} entries):`);
      profile.experience.slice(0, 3).forEach((e) =>
        lines.push(`    • ${e.role || "?"} @ ${e.company || "?"} [${e.startDate || "?"}→${e.endDate || "Present"}]${e.description ? `: ${e.description.slice(0, 80)}` : ""}`)
      );
    } else {
      lines.push(`  experience: NONE PROVIDED`);
    }

    if (profile.education.length > 0) {
      profile.education.slice(0, 2).forEach((e) =>
        lines.push(`  education: ${e.degree || "?"} in ${e.fieldOfStudy || "?"} @ ${e.institution || "?"}`)
      );
    } else {
      lines.push(`  education: NONE PROVIDED`);
    }

    if (profile.certifications.length > 0) {
      lines.push(`  certifications: ${profile.certifications.map((c) => c.name).join(", ")}`);
    }

    if (profile.skills.length > 0) {
      lines.push(`  skills: ${profile.skills.slice(0, 10).map((s) => s.name || "?").join(", ")}${profile.skills.length > 10 ? "…" : ""}`);
    }

    return lines.join("\n");
  });

  return `${NARRATIVE_SYSTEM_PROMPT}

Job: ${job.title}
Required skills: ${job.requiredSkills.join(", ")}
Minimum experience: ${job.minimumExperience} yr(s)
Education requirement: ${job.education}

${candidateBlocks.map((b) => `${sep}\n${b}`).join("\n\n")}
${sep}

Write narrative for all ${scored.length} candidates listed above.`;
}

// ─────────────────────────────────────────────────────────────
// Gemini quota-error detection
// ─────────────────────────────────────────────────────────────

export const isGeminiQuotaError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit");
};

// ─────────────────────────────────────────────────────────────
// Public API — main entry point
// ─────────────────────────────────────────────────────────────

export const runGeminiScreening = async (
  input: ScreeningInput
): Promise<{ shortlist: ShortlistItem[] }> => {
  // ── Step 1: Score all applicants deterministically ───────
  const allScored = input.applicants.map((a) => scoreApplicant(a, input.job));

  // ── Step 2: Sort by matchScore, take top N ───────────────
  const topScored = [...allScored]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, input.topN);

  // ── Step 3: Attempt Gemini narrative generation ──────────
  let narrativeMap: Record<string, Pick<ShortlistItem, "explanation" | "strengths" | "gapsAndRisks">> = {};
  let scoredBy: ShortlistItem["scoredBy"] = "deterministic+fallback";

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model  = client.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.15,
          topP: 0.85,
          maxOutputTokens: 8192,
        },
      });

      const prompt   = buildNarrativePrompt(topScored, input.job);
      const response = await model.generateContent(prompt);
      const text     = response.response.text().trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed = JSON.parse(text) as { narratives: Array<{ candidateId: string; explanation: string; strengths: string[]; gapsAndRisks: string[] }> };

      for (const n of parsed.narratives) {
        narrativeMap[n.candidateId] = {
          explanation:  n.explanation  || "",
          strengths:    Array.isArray(n.strengths)    ? n.strengths    : [],
          gapsAndRisks: Array.isArray(n.gapsAndRisks) ? n.gapsAndRisks : [],
        };
      }
      scoredBy = "deterministic+gemini";
    } catch (err) {
      // Gemini failed — fall through to template narratives silently
      console.warn("[Gemini] Narrative generation failed, using template fallback:", err instanceof Error ? err.message : err);
    }
  }

  // ── Step 4: Merge scores + narrative ────────────────────
  const shortlist: ShortlistItem[] = topScored.map((s, idx) => {
    const narrative = narrativeMap[s.candidateId] ?? buildTemplateNarrative(s, input.job);

    return {
      candidateId:              s.candidateId,
      rank:                     idx + 1,
      matchScore:               s.matchScore,
      skillsScore:              s.skillsScore,
      experienceScore:          s.experienceScore,
      educationScore:           s.educationScore,
      completenessScore:        s.completenessScore,
      matchedSkills:            s.matchedSkills,
      missingSkills:            s.missingSkills,
      calculatedExperienceYears: s.calculatedExperienceYears,
      explanation:              narrative.explanation,
      strengths:                narrative.strengths,
      gapsAndRisks:             narrative.gapsAndRisks,
      recommendation:           s.recommendation,  // ← always from deterministic layer
      scoredBy,
    };
  });

  return { shortlist };
};

/**
 * Pure deterministic fallback — no AI involved at all.
 * Useful for bulk operations, testing, or when Gemini is intentionally disabled.
 */
export const buildFallbackShortlist = (
  input: ScreeningInput
): { shortlist: ShortlistItem[] } => {
  const allScored = input.applicants.map((a) => scoreApplicant(a, input.job));
  const topScored = [...allScored]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, input.topN);

  const shortlist: ShortlistItem[] = topScored.map((s, idx) => ({
    ...buildTemplateNarrative(s, input.job),
    candidateId:               s.candidateId,
    rank:                      idx + 1,
    matchScore:                s.matchScore,
    skillsScore:               s.skillsScore,
    experienceScore:           s.experienceScore,
    educationScore:            s.educationScore,
    completenessScore:         s.completenessScore,
    matchedSkills:             s.matchedSkills,
    missingSkills:             s.missingSkills,
    calculatedExperienceYears: s.calculatedExperienceYears,
    recommendation:            s.recommendation,
    scoredBy:                  "deterministic+fallback" as const,
  }));

  return { shortlist };
};