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

/**
 * Parse dates in various formats to YYYY-MM
 */
function normalizeDate(dateStr: string | unknown, format: "YYYY-MM" | "YYYY-MM-DD" = "YYYY-MM"): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const str = dateStr.trim();
  if (str.toLowerCase() === "present" || str.toLowerCase() === "current") return "Present";
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) return str.slice(0, format === "YYYY-MM" ? 7 : 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split("/");
    return format === "YYYY-MM" ? `${y}-${m.padStart(2, "0")}` : `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

/**
 * Normalize skill level enum
 */
function normalizeSkillLevel(level: unknown): "Beginner" | "Intermediate" | "Advanced" | "Expert" | undefined {
  if (!level || typeof level !== "string") return undefined;
  const lower = level.toLowerCase();
  if (lower.includes("beginner") || lower.includes("junior")) return "Beginner";
  if (lower.includes("intermediate") || lower.includes("mid")) return "Intermediate";
  if (lower.includes("advanced") || lower.includes("senior")) return "Advanced";
  if (lower.includes("expert") || lower.includes("master") || lower.includes("lead")) return "Expert";
  return undefined;
}

/**
 * Normalize language proficiency enum
 */
function normalizeLanguageProficiency(prof: unknown): "Basic" | "Conversational" | "Fluent" | "Native" | undefined {
  if (!prof || typeof prof !== "string") return undefined;
  const lower = prof.toLowerCase();
  if (lower.includes("basic") || lower.includes("beginner")) return "Basic";
  if (lower.includes("conversational") || lower.includes("intermediate")) return "Conversational";
  if (lower.includes("fluent") || lower.includes("advanced")) return "Fluent";
  if (lower.includes("native") || lower.includes("mother")) return "Native";
  return undefined;
}

/**
 * Parse structured skills array
 */
function parseSkills(skillsData: unknown): Skill[] {
  if (!skillsData) return [];
  if (Array.isArray(skillsData)) {
    return skillsData
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
  if (typeof skillsData === "string") {
    return skillsData
      .split(",")
      .map((s) => ({ name: s.trim(), level: "Intermediate" as const, yearsOfExperience: 1 }))
      .filter((s) => s.name);
  }
  return [];
}

/**
 * Parse structured languages array
 */
function parseLanguages(langData: unknown): Language[] {
  if (!langData) return [];
  if (Array.isArray(langData)) {
    return langData
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
  return [];
}

/**
 * Parse structured experience array
 */
function parseExperience(expData: unknown): Experience[] {
  if (!expData || !Array.isArray(expData)) return [];
  return expData
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const company = String(obj.company || obj.Company || "");
      const role = String(obj.role || obj.Role || obj.position || obj.Position || "");
      if (!company || !role) return null;
      const startDate = normalizeDate(obj.startDate || obj.start_date || obj["Start Date"]);
      const endDateRaw = obj.endDate || obj.end_date || obj["End Date"] || "Present";
      const endDate = normalizeDate(endDateRaw);
      const isCurrent = endDateRaw === "Present" || String(endDateRaw).toLowerCase() === "present";
      return {
        company,
        role,
        startDate,
        endDate,
        description: String(obj.description || obj.Description || "").trim() || undefined,
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

/**
 * Parse structured education array
 */
function parseEducation(eduData: unknown): Education[] {
  if (!eduData || !Array.isArray(eduData)) return [];
  return eduData
    .map((item) => {
      if (typeof item === "string") return null;
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const institution = String(obj.institution || obj.Institution || obj.school || obj.School || "");
      if (!institution) return null;
      return {
        institution,
        degree: String(obj.degree || obj.Degree || ""),
        fieldOfStudy: String(obj.fieldOfStudy || obj.field_of_study || obj.Field || ""),
        startYear: typeof obj.startYear === "number" ? obj.startYear : undefined,
        endYear: typeof obj.endYear === "number" ? obj.endYear : undefined,
      };
    })
    .filter((e) => e) as Education[];
}

/**
 * Parse structured certifications array
 */
function parseCertifications(certData: unknown): Certification[] {
  if (!certData || !Array.isArray(certData)) return [];
  return certData
    .map((item) => {
      if (typeof item === "string") return { name: item };
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      return {
        name: String(obj.name || obj.Name || ""),
        issuer: String(obj.issuer || obj.Issuer || ""),
        issueDate: normalizeDate(obj.issueDate || obj.issue_date),
      };
    })
    .filter((c) => c && c.name) as Certification[];
}

/**
 * Parse structured projects array
 */
function parseProjects(projData: unknown): Project[] {
  if (!projData || !Array.isArray(projData)) return [];
  return projData
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const name = String(obj.name || obj.Name || "");
      if (!name) return null;
      return {
        name,
        description: String(obj.description || obj.Description || ""),
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

/**
 * Parse availability object
 */
function parseAvailability(availData: unknown): Availability | undefined {
  if (!availData || typeof availData !== "object") return undefined;
  const obj = availData as UnknownRecord;
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

/**
 * Parse social links object
 */
function parseSocialLinks(socialData: unknown): SocialLinks {
  if (!socialData || typeof socialData !== "object") return {};
  const obj = socialData as UnknownRecord;
  return {
    linkedin: String(obj.linkedin || obj.linkedIn || "").trim() || undefined,
    github: String(obj.github || obj.GitHub || "").trim() || undefined,
    portfolio: String(obj.portfolio || obj.Portfolio || "").trim() || undefined,
  };
}

/**
 * Extract name parts
 */
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

/**
 * Parse legacy experiences array (with "experiences" key and "company"/"title" fields)
 */
function parseLegacyExperiences(expData: unknown): Experience[] {
  if (!expData || !Array.isArray(expData)) return [];
  return expData
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      
      // Handle both new format (role/company) and legacy format (title/company)
      const company = String(obj.company || "");
      const role = String(obj.title || obj.role || "");
      
      if (!company && !role) return null;
      
      const startDate = normalizeDate(obj.startDate || obj.start_date || "");
      const endDate = normalizeDate(obj.endDate || obj.end_date || "");
      
      return {
        company: company || "Unknown",
        role: role || "Position",
        startDate: startDate || "2000-01",
        endDate: endDate || "Present",
        description: String(obj.description || ""),
        technologies: Array.isArray(obj.technologies)
          ? obj.technologies.map((t) => String(t))
          : [],
      };
    })
    .filter((e) => e) as Experience[];
}

/**
 * Parse legacy educations array
 */
function parseLegacyEducations(eduData: unknown): Education[] {
  if (!eduData || !Array.isArray(eduData)) return [];
  return eduData
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      
      const institution = String(obj.school || obj.institution || "");
      const degree = String(obj.degree || "");
      
      if (!institution && !degree) return null;
      
      return {
        institution: institution || "Unknown",
        degree: degree || "Degree",
        fieldOfStudy: String(obj.major || obj.fieldOfStudy || ""),
        startYear: typeof obj.startDate === "string" 
          ? parseInt(obj.startDate.split("-")[0]) 
          : typeof obj.startYear === "number" ? obj.startYear : undefined,
        endYear: typeof obj.endDate === "string"
          ? parseInt(obj.endDate.split("-")[0])
          : typeof obj.endYear === "number" ? obj.endYear : undefined,
      };
    })
    .filter((e) => e) as Education[];
}

/**
 * Parse legacy certificates array
 */
function parseLegacyCertificates(certData: unknown): Certification[] {
  if (!certData || !Array.isArray(certData)) return [];
  return certData
    .map((item) => {
      if (typeof item === "string") return { name: item };
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      
      return {
        name: String(obj.name || ""),
        issuer: String(obj.issuer || ""),
        issueDate: normalizeDate(String(obj.issueDate || "")),
      };
    })
    .filter((c) => c && c.name) as Certification[];
}

/**
 * Parse legacy projects array
 */
function parseLegacyProjects(projData: unknown): Project[] {
  if (!projData || !Array.isArray(projData)) return [];
  return projData
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      
      const name = String(obj.name || "");
      if (!name) return null;
      
      return {
        name,
        description: String(obj.description || ""),
        technologies: Array.isArray(obj.technologies)
          ? obj.technologies.map((t) => String(t))
          : [],
        role: String(obj.role || ""),
        link: String(obj.url || obj.link || ""),
        startDate: normalizeDate(String(obj.startDate || "")),
        endDate: normalizeDate(String(obj.endDate || "")),
      };
    })
    .filter((p) => p) as Project[];
}

/**
 * Parse legacy social links (using "links" key)
 */
function parseLegacySocialLinks(socialData: unknown): SocialLinks {
  if (!socialData || typeof socialData !== "object") return {};
  
  const obj = socialData as UnknownRecord;
  
  return {
    linkedin: String(obj.linkedinUrl || obj.linkedin || "").trim() || undefined,
    github: String(obj.githubUrl || obj.github || "").trim() || undefined,
    portfolio: String(obj.portfolioUrl || obj.portfolio || "").trim() || undefined,
  };
}

// Update buildStructuredProfile to handle both formats
export function buildStructuredProfile(raw: UnknownRecord): StructuredProfile {
  const { firstName, lastName, fullName } = extractName(raw);
  
  // Handle legacy field names
  const skills = parseSkills(raw.skills) || [];
  
  // Try new format first, then legacy format
  const experiences = parseExperience(raw.experience) || [];
  const educations = parseEducation(raw.education) || [];
  const certifications = parseCertifications(raw.certifications) || [];
  const projects = parseProjects(raw.projects) || [];
  
  // Fallback to legacy formats if new formats are empty
  const finalExperiences = experiences.length > 0 
    ? experiences 
    : parseLegacyExperiences(raw.experiences);
  
  const finalEducations = educations.length > 0
    ? educations
    : parseLegacyEducations(raw.educations);
  
  const finalCertifications = certifications.length > 0
    ? certifications
    : parseLegacyCertificates(raw.certificates);
  
  const finalProjects = projects.length > 0
    ? projects
    : parseLegacyProjects(raw.projects);
  
  // Handle social links - try both new and legacy formats
  let socialLinks = parseSocialLinks(raw.socialLinks || raw.social_links);
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    socialLinks = parseLegacySocialLinks(raw.links);
  }
  
  // RULE: bio → headline (canonical headline should prefer bio if present)
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

/**
 * Central normalization - handles structured JSON/CSV/Excel/PDF ingestion
 * Returns both flat fields (for DB indexes) and structured profile (for rich data)
 */
export const normalizeApplicantPayload = (raw: UnknownRecord) => {
  const { firstName, lastName, fullName } = extractName(raw);
  
  const email = String(raw.email || `${fullName.toLowerCase().replaceAll(" ", ".")}@unknown.local`)
    .trim()
    .toLowerCase();

  // Calculate years of experience from experience array or direct field
  const experienceArray = Array.isArray(raw.experience) ? raw.experience : [];
  const yearsFromExperienceObjects = experienceArray.reduce((acc, entry) => {
    if (!entry || typeof entry !== "object") return acc;
    const startDate = String((entry as UnknownRecord).startDate ?? (entry as UnknownRecord)["Start Date"] ?? "");
    const endDate = String((entry as UnknownRecord).endDate ?? (entry as UnknownRecord)["End Date"] ?? "");
    if (!startDate) return acc;
    const start = new Date(`${startDate}-01`);
    const end = endDate.toLowerCase() === "present" || !endDate ? new Date() : new Date(`${endDate}-01`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return acc;
    const diffYears = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    return acc + diffYears;
  }, 0);

  const yearsOfExperience =
    Number(raw.yearsOfExperience ?? raw.experienceYears ?? raw.experience ?? 0) ||
    Math.round(yearsFromExperienceObjects);

  // Flatten education array for legacy flat field
  const education = Array.isArray(raw.education)
    ? raw.education
        .map((item) => (typeof item === "string" ? item : (item as UnknownRecord)?.degree || JSON.stringify(item)))
        .join(" | ")
    : typeof raw.education === "string"
      ? raw.education
      : "Not provided";

  // Flatten skills array for legacy flat field
  const skills = parseSkills(raw.skills).map((s) => s.name);

  const headline = String(raw.headline || raw.title || "").trim();
  const bio = String(raw.bio || raw.summary || "").trim();
  const summary = headline || bio || (typeof raw.summary === "string" ? raw.summary : "");

  // Build canonical structured profile
  const structuredProfile = buildStructuredProfile(raw);

  return {
    // Flat fields for legacy compatibility & DB indexing
    fullName,
    email,
    phone: String(raw.phone || "").trim() || undefined,
    yearsOfExperience,
    education,
    skills,
    summary,
    resumeText: String(raw.resumeText || "").trim() || undefined,
    source: String(raw.source ?? "json") as "json" | "csv" | "excel" | "pdf",
    
    // Rich structured data (canonical format)
    structuredProfile,
    
    // Preserve raw data for debugging/re-parsing
    profileData: {
      raw,
      parseDate: new Date().toISOString(),
    },
  };
};
