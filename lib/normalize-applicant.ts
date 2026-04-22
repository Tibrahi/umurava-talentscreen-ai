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

function normalizeDate(dateStr: string | unknown, format: "YYYY-MM" | "YYYY-MM-DD" = "YYYY-MM"): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const str = dateStr.trim();
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
  if (typeof langData === "string") {
    return langData
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  return [];
}

function parseExperience(expData: unknown): Experience[] {
  if (!expData) return [];
  
  // CSV string fallback
  if (typeof expData === "string") {
    return expData.split(",").map(company => ({
      company: company.trim(),
      role: "Professional Role",
      startDate: "",
      endDate: "Present",
      isCurrent: true,
      technologies: []
    })).filter(e => e.company);
  }

  if (!Array.isArray(expData)) return [];
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

function parseEducation(eduData: unknown): Education[] {
  if (!eduData) return [];
  
  // CSV string fallback
  if (typeof eduData === "string") {
    return eduData.split(",").map(school => ({
      institution: school.trim(),
      degree: "Degree",
      fieldOfStudy: ""
    })).filter(e => e.institution);
  }

  if (!Array.isArray(eduData)) return [];
  return eduData
    .map((item) => {
      if (typeof item === "string") return { institution: item, degree: "Degree", fieldOfStudy: "" };
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

function parseCertifications(certData: unknown): Certification[] {
  if (!certData) return [];
  
  if (typeof certData === "string") {
    return certData.split(",").map(name => ({ name: name.trim(), issuer: "" })).filter(c => c.name);
  }

  if (!Array.isArray(certData)) return [];
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

function parseProjects(projData: unknown): Project[] {
  if (!projData) return [];
  
  if (typeof projData === "string") {
    return projData.split(",").map(name => ({ 
      name: name.trim(), 
      description: "", 
      technologies: [], 
      role: "", 
      link: "", 
      startDate: "", 
      endDate: "" 
    })).filter(p => p.name);
  }

  if (!Array.isArray(projData)) return [];
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

function parseSocialLinks(socialData: unknown): SocialLinks {
  if (!socialData || typeof socialData !== "object") return {};
  const obj = socialData as UnknownRecord;
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

function parseLegacyExperiences(expData: unknown): Experience[] {
  if (!expData || !Array.isArray(expData)) return [];
  return expData
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
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
        technologies: Array.isArray(obj.technologies) ? obj.technologies.map((t) => String(t)) : [],
      };
    })
    .filter((e) => e) as Experience[];
}

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
        startYear: typeof obj.startDate === "string" ? parseInt(obj.startDate.split("-")[0]) : typeof obj.startYear === "number" ? obj.startYear : undefined,
        endYear: typeof obj.endDate === "string" ? parseInt(obj.endDate.split("-")[0]) : typeof obj.endYear === "number" ? obj.endYear : undefined,
      };
    })
    .filter((e) => e) as Education[];
}

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
        technologies: Array.isArray(obj.technologies) ? obj.technologies.map((t) => String(t)) : [],
        role: String(obj.role || ""),
        link: String(obj.url || obj.link || ""),
        startDate: normalizeDate(String(obj.startDate || "")),
        endDate: normalizeDate(String(obj.endDate || "")),
      };
    })
    .filter((p) => p) as Project[];
}

function parseLegacySocialLinks(socialData: unknown): SocialLinks {
  if (!socialData || typeof socialData !== "object") return {};
  const obj = socialData as UnknownRecord;
  return {
    linkedin: String(obj.linkedinUrl || obj.linkedin || "").trim() || undefined,
    github: String(obj.githubUrl || obj.github || "").trim() || undefined,
    portfolio: String(obj.portfolioUrl || obj.portfolio || "").trim() || undefined,
  };
}

export function buildStructuredProfile(raw: UnknownRecord): StructuredProfile {
  const { firstName, lastName, fullName } = extractName(raw);
  
  const skills = parseSkills(raw.skills) || [];
  const experiences = parseExperience(raw.experience) || [];
  const educations = parseEducation(raw.education) || [];
  const certifications = parseCertifications(raw.certifications) || [];
  const projects = parseProjects(raw.projects) || [];
  
  const finalExperiences = experiences.length > 0 ? experiences : parseLegacyExperiences(raw.experiences);
  const finalEducations = educations.length > 0 ? educations : parseLegacyEducations(raw.educations);
  const finalCertifications = certifications.length > 0 ? certifications : parseLegacyCertificates(raw.certificates);
  const finalProjects = projects.length > 0 ? projects : parseLegacyProjects(raw.projects);
  
  let socialLinks = parseSocialLinks(raw.socialLinks || raw.social_links);
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    socialLinks = parseLegacySocialLinks(raw.links);
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
  const { firstName, lastName, fullName } = extractName(raw);
  
  // FIX: Attach a random suffix if email doesn't exist to prevent MongoDB E11000 bulk duplicate crashes
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const cleanName = fullName.toLowerCase().replace(/\s+/g, ".");
  const fallbackEmail = `${cleanName}.${randomSuffix}@unknown.local`;
  const email = String(raw.email || fallbackEmail).trim().toLowerCase();

  const structuredProfile = buildStructuredProfile(raw);

  const yearsFromExperienceObjects = (structuredProfile.experience ?? []).reduce((acc, entry) => {
    const startDate = String(entry.startDate || "");
    const endDate = String(entry.endDate || "");
    if (!startDate) return acc;
    const start = new Date(`${startDate}-01`);
    const end = endDate.toLowerCase() === "present" || !endDate ? new Date() : new Date(`${endDate}-01`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return acc;
    const diffYears = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    return acc + diffYears;
  }, 0);

  const yearsDirect = Number(raw.yearsOfExperience ?? raw.experienceYears ?? 0);
  const yearsOfExperience = yearsDirect > 0 ? yearsDirect : Math.max(0, Math.round(yearsFromExperienceObjects));

  const education = Array.isArray(raw.education)
    ? raw.education.map((item) => (typeof item === "string" ? item : (item as UnknownRecord)?.degree || JSON.stringify(item))).join(" | ")
    : typeof raw.education === "string" ? raw.education : "Not provided";

  const skills = parseSkills(raw.skills).map((s) => s.name);

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