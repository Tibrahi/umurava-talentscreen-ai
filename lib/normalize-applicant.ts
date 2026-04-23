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

type UnknownRecord = Record<string, unknown>;

// Aggressive JSON parser to handle stringified objects/arrays from messy inputs
function tryParseJSON(data: unknown): any {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return parsed;
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
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split("/");
    return format === "YYYY-MM" ? `${y}-${m.padStart(2, "0")}` : `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const monthMatch = str
    .replace(",", " ")
    .replace(/\s+/g, " ")
    .trim()
    .match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const year = monthMatch[2];
    const months: Record<string, string> = {
      jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
      apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
      aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10",
      october: "10", nov: "11", november: "11", dec: "12", december: "12",
    };
    const m = months[monthName];
    if (m) return format === "YYYY-MM" ? `${year}-${m}` : `${year}-${m}-01`;
  }
  return "";
}

function normalizeSkillLevel(level: unknown): "Beginner" | "Intermediate" | "Advanced" | "Expert" | undefined {
  if (!level || typeof level !== "string") return undefined;
  const lower = level.toLowerCase();
  if (lower.includes("beginner") || lower.includes("junior")) return "Beginner";
  if (lower.includes("intermediate") || lower.includes("mid")) return "Intermediate";
  if (lower.includes("advanced") || lower.includes("senior")) return "Advanced";
  if (lower.includes("expert") || lower.includes("master") || lower.includes("lead")) return "Expert";
  return undefined;
}

function normalizeLanguageProficiency(prof: unknown): "Basic" | "Conversational" | "Fluent" | "Native" | undefined {
  if (!prof || typeof prof !== "string") return undefined;
  const lower = prof.toLowerCase();
  if (lower.includes("basic") || lower.includes("beginner")) return "Basic";
  if (lower.includes("conversational") || lower.includes("intermediate")) return "Conversational";
  if (lower.includes("fluent") || lower.includes("advanced")) return "Fluent";
  if (lower.includes("native") || lower.includes("mother")) return "Native";
  return undefined;
}

function parseSkills(skillsData: unknown): Skill[] {
  const parsed = tryParseJSON(skillsData);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === "string") return { name: item, level: "Intermediate", yearsOfExperience: 1 };
        if (item && typeof item === "object") {
          const obj = item as UnknownRecord;
          return {
            name: String(obj.name || ""),
            level: normalizeSkillLevel(obj.level) ?? "Intermediate",
            yearsOfExperience: typeof obj.yearsOfExperience === "number" ? obj.yearsOfExperience : 1,
          };
        }
        return null;
      })
      .filter((s) => s && s.name) as Skill[];
  }
  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((s) => ({ name: s.trim(), level: "Intermediate" as const, yearsOfExperience: 1 }))
      .filter((s) => s.name);
  }
  return [];
}

function parseLanguages(langData: unknown): Language[] {
  const parsed = tryParseJSON(langData);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === "string") return { name: item };
        if (item && typeof item === "object") {
          const obj = item as UnknownRecord;
          return {
            name: String(obj.name || ""),
            proficiency: normalizeLanguageProficiency(obj.proficiency),
          };
        }
        return null;
      })
      .filter((l) => l && l.name) as Language[];
  }
  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  return [];
}

function parseExperience(expData: unknown): Experience[] {
  const parsed = tryParseJSON(expData);
  if (!parsed) return [];
  
  if (typeof parsed === "string") {
    return parsed.split(",").map(company => ({
      company: company.trim(),
      role: "Professional Role",
      startDate: "",
      endDate: "Present",
      isCurrent: true,
      technologies: []
    })).filter(e => e.company);
  }

  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const company = String(obj.company || obj.Company || obj.employer || "");
      const role = String(obj.role || obj.Role || obj.position || obj.title || "");
      if (!company && !role) return null;
      const startDate = normalizeDate(obj.startDate || obj.start_date || obj["Start Date"]);
      const endDateRaw = obj.endDate || obj.end_date || obj["End Date"] || "Present";
      const endDate = normalizeDate(endDateRaw);
      const isCurrent = endDateRaw === "Present" || String(endDateRaw).toLowerCase() === "present" || !endDateRaw;
      return {
        company: company || "Unknown Company",
        role: role || "Professional",
        startDate,
        endDate,
        description: String(obj.description || obj.Description || obj.summary || "").trim() || undefined,
        technologies: Array.isArray(obj.technologies)
          ? obj.technologies.map((t) => String(t))
          : typeof obj.technologies === "string"
            ? obj.technologies.split(",").map((t) => t.trim())
            : [],
        isCurrent,
      };
    })
    .filter((e) => e) as Experience[];
}

function parseEducation(eduData: unknown): Education[] {
  const parsed = tryParseJSON(eduData);
  if (!parsed) return [];
  
  if (typeof parsed === "string") {
    return parsed.split(",").map(school => ({
      institution: school.trim(),
      degree: "Degree",
      fieldOfStudy: ""
    })).filter(e => e.institution);
  }

  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item === "string") return { institution: item, degree: "Degree", fieldOfStudy: "" };
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const institution = String(obj.institution || obj.Institution || obj.school || obj.School || obj.university || "");
      const degree = String(obj.degree || obj.Degree || obj.title || "");
      if (!institution && !degree) return null;
      return {
        institution: institution || "Unknown Institution",
        degree: degree || "Degree",
        fieldOfStudy: String(obj.fieldOfStudy || obj.field_of_study || obj.major || obj.Field || ""),
        startYear: typeof obj.startYear === "number" ? obj.startYear : parseInt(String(obj.startYear || obj.startDate || "")) || undefined,
        endYear: typeof obj.endYear === "number" ? obj.endYear : parseInt(String(obj.endYear || obj.endDate || "")) || undefined,
      };
    })
    .filter((e) => e) as Education[];
}

function parseCertifications(certData: unknown): Certification[] {
  const parsed = tryParseJSON(certData);
  if (!parsed) return [];
  
  if (typeof parsed === "string") {
    return parsed.split(",").map(name => ({ name: name.trim(), issuer: "" })).filter(c => c.name);
  }

  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item === "string") return { name: item };
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      return {
        name: String(obj.name || obj.Name || obj.title || ""),
        issuer: String(obj.issuer || obj.Issuer || obj.authority || ""),
        issueDate: normalizeDate(obj.issueDate || obj.issue_date || obj.date),
      };
    })
    .filter((c) => c && c.name) as Certification[];
}

function parseProjects(projData: unknown): Project[] {
  const parsed = tryParseJSON(projData);
  if (!parsed) return [];
  
  if (typeof parsed === "string") {
    return parsed.split(",").map(name => ({ 
      name: name.trim(), 
      description: "", 
      technologies: [], 
      role: "", 
      link: "", 
      startDate: "", 
      endDate: "" 
    })).filter(p => p.name);
  }

  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const name = String(obj.name || obj.Name || obj.title || "");
      if (!name) return null;
      return {
        name,
        description: String(obj.description || obj.Description || obj.summary || ""),
        technologies: Array.isArray(obj.technologies)
          ? obj.technologies.map((t) => String(t))
          : typeof obj.technologies === "string"
            ? obj.technologies.split(",").map((t) => t.trim())
            : [],
        role: String(obj.role || obj.Role || ""),
        link: String(obj.link || obj.Link || obj.url || obj.URL || ""),
        startDate: normalizeDate(obj.startDate || obj.start_date),
        endDate: normalizeDate(obj.endDate || obj.end_date),
      };
    })
    .filter((p) => p) as Project[];
}

function parseAvailability(availData: unknown): Availability | undefined {
  const parsed = tryParseJSON(availData);
  if (!parsed || typeof parsed !== "object") return undefined;
  const obj = parsed as UnknownRecord;
  const status = String(obj.status || "");
  const validStatuses = ["Available", "Open to Opportunities", "Not Available"];
  const typeStr = String(obj.type || "");
  const validTypes = ["Full-time", "Part-time", "Contract"];
  
  const result: Availability = {};
  if (validStatuses.includes(status)) result.status = status as any;
  if (validTypes.includes(typeStr)) result.type = typeStr as any;
  const startDate = normalizeDate(String(obj.startDate || ""), "YYYY-MM-DD");
  if (startDate) result.startDate = startDate;
  
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseSocialLinks(socialData: unknown): SocialLinks {
  const parsed = tryParseJSON(socialData);
  if (!parsed || typeof parsed !== "object") return {};
  const obj = parsed as UnknownRecord;
  return {
    linkedin: String(obj.linkedin || obj.linkedIn || "").trim() || undefined,
    github: String(obj.github || obj.GitHub || "").trim() || undefined,
    portfolio: String(obj.portfolio || obj.Portfolio || "").trim() || undefined,
  };
}

function extractName(raw: UnknownRecord): { firstName: string; lastName: string; fullName: string } {
  const firstName = String(raw.firstName || raw.first_name || "").trim();
  const lastName = String(raw.lastName || raw.last_name || "").trim();
  const fullName = String(raw.fullName || raw.full_name || raw.name || "").trim();
  
  if (fullName && !firstName && !lastName) {
    const parts = fullName.split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      fullName,
    };
  }
  
  return {
    firstName,
    lastName,
    fullName: fullName || `${firstName} ${lastName}`.trim() || "Unknown Candidate",
  };
}

export function buildStructuredProfile(raw: UnknownRecord): StructuredProfile {
  const { firstName, lastName, fullName } = extractName(raw);
  
  const skills = parseSkills(raw.skills) || [];
  const experiences = parseExperience(raw.experience) || [];
  const educations = parseEducation(raw.education) || [];
  const certifications = parseCertifications(raw.certifications) || [];
  const projects = parseProjects(raw.projects) || [];
  
  const finalExperiences = experiences.length > 0 ? experiences : parseExperience(raw.experiences);
  const finalEducations = educations.length > 0 ? educations : parseEducation(raw.educations);
  const finalCertifications = certifications.length > 0 ? certifications : parseCertifications(raw.certificates);
  const finalProjects = projects.length > 0 ? projects : parseProjects(raw.projects);
  
  let socialLinks = parseSocialLinks(raw.socialLinks || raw.social_links);
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    socialLinks = parseSocialLinks(raw.links);
  }
  
  const headlineFromBio = String(raw.bio || "").trim();
  const headlineFromHeadline = String(raw.headline || raw.title || "").trim();
  const headline = headlineFromBio || headlineFromHeadline;

  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: String(raw.email || "").toLowerCase().trim(),
    headline: headline || undefined,
    bio: String(raw.bio || raw.summary || "").trim() || undefined,
    location: String(raw.location || raw.city || raw.address || "").trim() || undefined,
    skills,
    languages: parseLanguages(raw.languages) || [],
    experience: finalExperiences,
    education: finalEducations,
    certifications: finalCertifications,
    projects: finalProjects,
    availability:
      parseAvailability(raw.availability) ?? {
        status: "Open to Opportunities",
        type: "Full-time",
        startDate: undefined,
      },
    socialLinks: {
      linkedin: socialLinks.linkedin || undefined,
      github: socialLinks.github || undefined,
      portfolio: socialLinks.portfolio || undefined,
    },
  };
}

export const normalizeApplicantPayload = (raw: UnknownRecord) => {
  const { fullName } = extractName(raw);
  
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const cleanName = fullName.toLowerCase().replace(/\s+/g, ".");
  const fallbackEmail = `${cleanName}.${randomSuffix}@unknown.local`;
  const email = String(raw.email || fallbackEmail).trim().toLowerCase();

  const structuredProfile = buildStructuredProfile(raw);

  // FIX: Accurately calculate years using the finalized experience array
  const yearsFromExperienceObjects = (structuredProfile.experience ?? []).reduce((acc, entry) => {
    const startDate = String(entry.startDate || "");
    const endDate = String(entry.endDate || "");
    if (!startDate) return acc;
    
    let start = new Date(`${startDate}-01`);
    if (Number.isNaN(start.getTime())) start = new Date(startDate);
    
    let end = new Date();
    if (endDate && endDate.toLowerCase() !== "present") {
      end = new Date(`${endDate}-01`);
      if (Number.isNaN(end.getTime())) end = new Date(endDate);
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return acc;
    const diffYears = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    return acc + diffYears;
  }, 0);

  const yearsDirect = Number(raw.yearsOfExperience ?? raw.experienceYears ?? 0);
  // Guarantee it doesn't fall back to 0 if we parsed dates
  const yearsOfExperience = yearsDirect > 0 ? yearsDirect : Math.max(0, Math.round(yearsFromExperienceObjects));

  const education = Array.isArray(structuredProfile.education) && structuredProfile.education.length > 0
    ? structuredProfile.education.map(e => `${e.degree || ''} ${e.institution ? `at ${e.institution}` : ''}`.trim()).join(" | ")
    : typeof raw.education === "string" ? raw.education : "Not provided";

  const skills = structuredProfile.skills?.map((s) => s.name) || [];

  const headline = String(raw.headline || raw.title || "").trim();
  const bio = String(raw.bio || raw.summary || "").trim();
  const summary = headline || bio || (typeof raw.summary === "string" ? raw.summary : "");

  return {
    fullName,
    email,
    phone: String(raw.phone || "").trim() || undefined,
    yearsOfExperience,
    education,
    skills,
    summary,
    resumeText: String(raw.resumeText || "").trim() || undefined,
    source: String(raw.source ?? "json") as "json" | "csv" | "excel" | "pdf",
    structuredProfile,
    profileData: {
      raw,
      parseDate: new Date().toISOString(),
    },
  };
};