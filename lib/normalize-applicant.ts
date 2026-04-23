import type {
  StructuredProfile,
  Skill,
  Language,
  Experience,
  Education,
  Certification,
  Project,
  Availability,
  SocialLinks,
} from "./types";

// Aggressive JSON parser to handle deeply stringified and escaped objects/arrays from messy CSV inputs
export function tryParseJSON(data: unknown): any {
  if (typeof data === "string") {
    let cleanString = data.trim();
    // Remove wrapping quotes if they exist from CSV escaping
    if (cleanString.startsWith('"') && cleanString.endsWith('"')) {
      cleanString = cleanString.slice(1, -1);
    }
    // Fix double-escaped quotes ("" -> ")
    cleanString = cleanString.replace(/""/g, '"');
    
    try {
      return JSON.parse(cleanString);
    } catch {
      return data;
    }
  }
  return data;
}

function normalizeDate(dateStr: string | unknown, format: "YYYY-MM" | "YYYY-MM-DD" = "YYYY-MM"): string {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  if (str.toLowerCase() === "present" || str.toLowerCase() === "current") return "Present";
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) return str.slice(0, format === "YYYY-MM" ? 7 : 10);
  if (/^\d{4}$/.test(str)) return format === "YYYY-MM" ? `${str}-01` : `${str}-01-01`;
  return str; // Fallback
}

export function buildStructuredProfile(raw: any): StructuredProfile {
  // Gracefully handle variations in keys (e.g., CSV column "First Name" vs JSON "firstName")
  const firstName = String(raw["First Name"] || raw.firstName || raw.first_name || "").trim();
  const lastName = String(raw["Last Name"] || raw.lastName || raw.last_name || "").trim();
  const email = String(raw["Email"] || raw.email || "").trim().toLowerCase();
  const headline = String(raw["Headline"] || raw.headline || raw.title || "").trim();
  const bio = String(raw["Bio"] || raw.bio || raw.summary || "").trim();
  const location = String(raw["Location"] || raw.location || "").trim();

  return {
    firstName,
    lastName,
    email,
    headline,
    bio,
    location,
    skills: Array.isArray(tryParseJSON(raw.skills)) ? tryParseJSON(raw.skills) : [],
    languages: Array.isArray(tryParseJSON(raw.languages)) ? tryParseJSON(raw.languages) : [],
    experience: Array.isArray(tryParseJSON(raw.experience)) ? tryParseJSON(raw.experience).map((exp: any) => ({
      ...exp,
      startDate: normalizeDate(exp["Start Date"] || exp.startDate),
      endDate: normalizeDate(exp["End Date"] || exp.endDate),
      isCurrent: exp["Is Current"] || exp.isCurrent || false,
    })) : [],
    education: Array.isArray(tryParseJSON(raw.education)) ? tryParseJSON(raw.education).map((edu: any) => ({
      ...edu,
      startYear: edu["Start Year"] || edu.startYear,
      endYear: edu["End Year"] || edu.endYear,
      fieldOfStudy: edu["Field of Study"] || edu.fieldOfStudy,
    })) : [],
    certifications: Array.isArray(tryParseJSON(raw.certifications)) ? tryParseJSON(raw.certifications).map((cert: any) => ({
      ...cert,
      issueDate: normalizeDate(cert["Issue Date"] || cert.issueDate),
    })) : [],
    projects: Array.isArray(tryParseJSON(raw.projects)) ? tryParseJSON(raw.projects).map((proj: any) => ({
      ...proj,
      startDate: normalizeDate(proj["Start Date"] || proj.startDate),
      endDate: normalizeDate(proj["End Date"] || proj.endDate),
    })) : [],
    availability: tryParseJSON(raw.availability) || undefined,
    socialLinks: tryParseJSON(raw.socialLinks) || undefined,
  };
}

export function normalizeApplicantPayload(raw: any, source: "csv" | "json" | "excel" | "pdf") {
  const structuredProfile = buildStructuredProfile(raw);
  
  const fullName = [structuredProfile.firstName, structuredProfile.lastName].filter(Boolean).join(" ");
  const finalFullName = fullName || "Unknown Candidate";
  const finalEmail = structuredProfile.email || `unknown.candidate.${Math.random().toString(36).slice(2, 8)}@unknown.local`;

  // Calculate years of experience dynamically if not provided explicitly
  const yearsFromExperienceObjects = (structuredProfile.experience || []).reduce((acc: number, exp: any) => {
    if (!exp.startDate) return acc;
    const start = new Date(exp.startDate + "-01");
    const end = exp.isCurrent || !exp.endDate || exp.endDate.toLowerCase() === "present" ? new Date() : new Date(exp.endDate + "-01");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return acc;
    return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }, 0);

  const yearsOfExperience = Math.max(0, Math.round(yearsFromExperienceObjects));

  const education = Array.isArray(structuredProfile.education) && structuredProfile.education.length > 0
    ? structuredProfile.education.map((e: any) => `${e.degree || ''} ${e.institution ? `at ${e.institution}` : ''}`.trim()).join(" | ")
    : "Not provided";

  const skills = structuredProfile.skills?.map((s: any) => s.name) || [];

  return {
    fullName: finalFullName,
    email: finalEmail,
    yearsOfExperience,
    education,
    skills,
    summary: structuredProfile.headline || structuredProfile.bio || "",
    source,
    profileData: raw, 
    structuredProfile,
  };
}