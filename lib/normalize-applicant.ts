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

// ---------------------------------------------------------------------------
// Unwrap nested profileData to always reach the original source data.
// Prevents the "profileData.raw.profileData.raw..." infinite nesting bug
// that causes education / skill corruption on every re-save / migration.
// ---------------------------------------------------------------------------
function unwrapToDeepestRaw(data: UnknownRecord): UnknownRecord {
  const pd = data.profileData;
  if (pd && typeof pd === "object" && !Array.isArray(pd)) {
    const inner = (pd as UnknownRecord).raw;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return unwrapToDeepestRaw(inner as UnknownRecord);
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Aggressive JSON parser – handles stringified objects/arrays from CSV cells
// ---------------------------------------------------------------------------
function tryParseJSON(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Date normalizer
// ---------------------------------------------------------------------------
function normalizeDate(
  dateStr: unknown,
  format: "YYYY-MM" | "YYYY-MM-DD" = "YYYY-MM"
): string {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  if (!str) return "";
  if (str.toLowerCase() === "present" || str.toLowerCase() === "current")
    return "Present";
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str))
    return str.slice(0, format === "YYYY-MM" ? 7 : 10);
  if (/^\d{4}$/.test(str))
    return format === "YYYY-MM" ? `${str}-01` : `${str}-01-01`;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split("/");
    return format === "YYYY-MM"
      ? `${y}-${m.padStart(2, "0")}`
      : `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const monthMatch = str
    .replace(",", " ")
    .replace(/\s+/g, " ")
    .trim()
    .match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const months: Record<string, string> = {
      jan: "01", january: "01", feb: "02", february: "02", mar: "03",
      march: "03", apr: "04", april: "04", may: "05", jun: "06", june: "06",
      jul: "07", july: "07", aug: "08", august: "08", sep: "09", sept: "09",
      september: "09", oct: "10", october: "10", nov: "11", november: "11",
      dec: "12", december: "12",
    };
    const m = months[monthMatch[1].toLowerCase()];
    if (m)
      return format === "YYYY-MM"
        ? `${monthMatch[2]}-${m}`
        : `${monthMatch[2]}-${m}-01`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Level / proficiency normalizers
// ---------------------------------------------------------------------------
function normalizeSkillLevel(
  level: unknown
): "Beginner" | "Intermediate" | "Advanced" | "Expert" | undefined {
  if (!level || typeof level !== "string") return undefined;
  const l = level.toLowerCase();
  if (l.includes("beginner") || l.includes("junior")) return "Beginner";
  if (l.includes("intermediate") || l.includes("mid")) return "Intermediate";
  if (l.includes("advanced") || l.includes("senior")) return "Advanced";
  if (l.includes("expert") || l.includes("master") || l.includes("lead"))
    return "Expert";
  return undefined;
}

function normalizeLanguageProficiency(
  prof: unknown
): "Basic" | "Conversational" | "Fluent" | "Native" | undefined {
  if (!prof || typeof prof !== "string") return undefined;
  const l = prof.toLowerCase();
  if (l.includes("basic") || l.includes("beginner")) return "Basic";
  if (l.includes("conversational") || l.includes("intermediate"))
    return "Conversational";
  if (l.includes("fluent") || l.includes("advanced")) return "Fluent";
  if (l.includes("native") || l.includes("mother")) return "Native";
  return undefined;
}

// ---------------------------------------------------------------------------
// Typed field helpers
// ---------------------------------------------------------------------------
function str(obj: UnknownRecord, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

function num(obj: UnknownRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseInt(v, 10);
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

function bool(obj: UnknownRecord, ...keys: string[]): boolean {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "boolean") return v;
    if (typeof v === "string" && v.toLowerCase() === "true") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
function parseSkills(skillsData: unknown): Skill[] {
  const parsed = tryParseJSON(skillsData);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === "string") {
          const name = item.trim();
          return name
            ? { name, level: "Intermediate" as const, yearsOfExperience: 1 }
            : null;
        }
        if (item && typeof item === "object") {
          const obj = item as UnknownRecord;
          const name = str(obj, "name", "skill", "title");
          if (!name) return null;
          const yoe =
            num(obj, "yearsOfExperience", "years", "experienceYears") ?? 1;
          return {
            name,
            level: normalizeSkillLevel(obj.level) ?? "Intermediate",
            yearsOfExperience: Math.max(0, Math.floor(yoe)),
          };
        }
        return null;
      })
      .filter((s) => s !== null && !!s.name) as Skill[];
  }

  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        level: "Intermediate" as const,
        yearsOfExperience: 1,
      }));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------
function parseLanguages(langData: unknown): Language[] {
  const parsed = tryParseJSON(langData);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === "string") return { name: item.trim() };
        if (item && typeof item === "object") {
          const obj = item as UnknownRecord;
          const name = str(obj, "name", "language");
          return name
            ? { name, proficiency: normalizeLanguageProficiency(obj.proficiency) }
            : null;
        }
        return null;
      })
      .filter((l) => l !== null && !!l.name) as Language[];
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

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------
function parseExperience(expData: unknown): Experience[] {
  const parsed = tryParseJSON(expData);
  if (!parsed) return [];

  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((company) => company.trim())
      .filter(Boolean)
      .map((company) => ({
        company,
        role: "Professional Role",
        startDate: "",
        endDate: "Present",
        isCurrent: true,
        technologies: [],
      }));
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;

      const company = str(obj, "company", "Company", "employer", "Employer");
      const role = str(
        obj,
        "role",
        "Role",
        "position",
        "Position",
        "title",
        "Title"
      );
      if (!company && !role) return null;

      const startRaw =
        obj.startDate ??
        obj.start_date ??
        obj["Start Date"] ??
        obj["start date"];
      const endRaw =
        obj.endDate ??
        obj.end_date ??
        obj["End Date"] ??
        obj["end date"] ??
        "Present";

      const startDate = normalizeDate(startRaw);
      const endDate = normalizeDate(endRaw);

      const isCurrentRaw = bool(
        obj,
        "isCurrent",
        "is_current",
        "Is Current",
        "IsCurrent",
        "current"
      );
      const isCurrent = endDate === "Present" || isCurrentRaw;
      const endDateFinal = isCurrent && !endDate ? "Present" : endDate;

      let technologies: string[] = [];
      const techRaw =
        obj.technologies ?? obj.tech ?? obj.stack ?? obj.Technologies;
      if (Array.isArray(techRaw)) {
        technologies = techRaw.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof techRaw === "string") {
        technologies = techRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      return {
        company: company || "Unknown Company",
        role: role || "Professional",
        startDate,
        endDate: endDateFinal,
        description:
          str(obj, "description", "Description", "summary") || undefined,
        technologies,
        isCurrent: endDateFinal === "Present",
      };
    })
    .filter((e) => e !== null) as Experience[];
}

// ---------------------------------------------------------------------------
// Education
// Handles "Field of Study", "Start Year", "End Year" (CSV/Excel variant)
// Also handles already-normalized pipe-separated strings like
// "Bachelor's at University of Rwanda | Master's at XYZ"
// so they don't get re-wrapped into "Degree at Bachelor's at..."
// ---------------------------------------------------------------------------
function parseEducation(eduData: unknown): Education[] {
  const parsed = tryParseJSON(eduData);
  if (!parsed) return [];

  // Already-normalized flat string: "Bachelor's at Uni | Master's at Uni2"
  // Detect by pipe separator OR by "at" pattern — split and parse each part.
  if (typeof parsed === "string") {
    // Try pipe-separated first
    const parts = parsed.includes("|")
      ? parsed.split("|").map((s) => s.trim()).filter(Boolean)
      : [parsed.trim()];

    return parts
      .map((part) => {
        // Pattern: "<degree> at <institution>"
        const atMatch = part.match(/^(.+?)\s+at\s+(.+)$/i);
        if (atMatch) {
          return {
            institution: atMatch[2].trim(),
            degree: atMatch[1].trim(),
          };
        }
        // Plain institution name
        return { institution: part, degree: "Degree" };
      })
      .filter((e) => e.institution || e.degree);
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item === "string") {
        // Handle string items within array too
        const atMatch = item.trim().match(/^(.+?)\s+at\s+(.+)$/i);
        if (atMatch) {
          return { institution: atMatch[2].trim(), degree: atMatch[1].trim() };
        }
        return { institution: item.trim(), degree: "Degree" };
      }
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;

      const institution = str(
        obj,
        "institution",
        "Institution",
        "school",
        "School",
        "university",
        "University"
      );
      const degree = str(obj, "degree", "Degree", "title");
      if (!institution && !degree) return null;

      const fieldOfStudy =
        str(
          obj,
          "fieldOfStudy",
          "field_of_study",
          "major",
          "Major",
          "Field",
          "field"
        ) ||
        str(obj, "Field of Study", "field of study", "FieldOfStudy") ||
        undefined;

      const startYear =
        num(
          obj,
          "startYear",
          "start_year",
          "Start Year",
          "startDate",
          "fromYear"
        ) ?? undefined;
      const endYear =
        num(
          obj,
          "endYear",
          "end_year",
          "End Year",
          "endDate",
          "toYear"
        ) ?? undefined;

      return {
        institution: institution || "Unknown Institution",
        degree: degree || "Degree",
        fieldOfStudy,
        startYear,
        endYear,
      };
    })
    .filter((e) => e !== null) as Education[];
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------
function parseCertifications(certData: unknown): Certification[] {
  const parsed = tryParseJSON(certData);
  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const name = str(obj, "name", "Name", "title");
      if (!name) return null;
      return {
        name,
        issuer: str(obj, "issuer", "Issuer", "authority") || undefined,
        issueDate:
          normalizeDate(
            obj.issueDate ??
              obj.issue_date ??
              obj["Issue Date"] ??
              obj["issue date"] ??
              obj.date
          ) || undefined,
      };
    })
    .filter((c) => c !== null) as Certification[];
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
function parseProjects(projData: unknown): Project[] {
  const parsed = tryParseJSON(projData);
  if (!parsed) return [];

  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const obj = item as UnknownRecord;
      const name = str(obj, "name", "Name", "title");
      if (!name) return null;

      let technologies: string[] = [];
      const techRaw = obj.technologies ?? obj.stack ?? obj.tech;
      if (Array.isArray(techRaw)) {
        technologies = techRaw.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof techRaw === "string") {
        technologies = techRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      return {
        name,
        description:
          str(obj, "description", "Description", "summary") || undefined,
        technologies,
        role: str(obj, "role", "Role") || undefined,
        link: str(obj, "link", "Link", "url", "URL") || undefined,
        startDate:
          normalizeDate(
            obj.startDate ?? obj.start_date ?? obj["Start Date"]
          ) || undefined,
        endDate:
          normalizeDate(obj.endDate ?? obj.end_date ?? obj["End Date"]) ||
          undefined,
      };
    })
    .filter((p) => p !== null) as Project[];
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------
function parseAvailability(availData: unknown): Availability | undefined {
  const parsed = tryParseJSON(availData);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return undefined;
  const obj = parsed as UnknownRecord;

  const validStatuses = ["Available", "Open to Opportunities", "Not Available"];
  const validTypes = ["Full-time", "Part-time", "Contract"];

  const statusRaw = str(obj, "status", "Status");
  const typeRaw = str(obj, "type", "Type");

  const result: Availability = {};
  if (validStatuses.includes(statusRaw))
    result.status = statusRaw as Availability["status"];
  if (validTypes.includes(typeRaw))
    result.type = typeRaw as Availability["type"];

  const startDateRaw =
    obj.startDate ??
    obj.start_date ??
    obj["Start Date"] ??
    obj["start date"];
  const startDate = normalizeDate(startDateRaw, "YYYY-MM-DD");
  if (startDate) result.startDate = startDate;

  return Object.keys(result).length > 0 ? result : undefined;
}

// ---------------------------------------------------------------------------
// Social Links
// ---------------------------------------------------------------------------
function parseSocialLinks(socialData: unknown): SocialLinks {
  const parsed = tryParseJSON(socialData);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const obj = parsed as UnknownRecord;
  return {
    linkedin: str(obj, "linkedin", "linkedIn", "LinkedIn") || undefined,
    github: str(obj, "github", "GitHub") || undefined,
    portfolio:
      str(obj, "portfolio", "Portfolio", "website") || undefined,
  };
}

// ---------------------------------------------------------------------------
// Name extraction
// ---------------------------------------------------------------------------
function extractName(raw: UnknownRecord): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  let firstName = str(raw, "firstName", "first_name");
  let lastName = str(raw, "lastName", "last_name");

  if (!firstName) firstName = str(raw, "First Name", "first name", "FirstName");
  if (!lastName) lastName = str(raw, "Last Name", "last name", "LastName");

  let fullName = str(
    raw,
    "fullName",
    "full_name",
    "name",
    "Full Name",
    "full name"
  );

  if (fullName && !firstName && !lastName) {
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  }

  if (!fullName && (firstName || lastName)) {
    fullName = `${firstName} ${lastName}`.trim();
  }

  return { firstName, lastName, fullName: fullName || "Unknown Candidate" };
}

// ---------------------------------------------------------------------------
// Email extraction
// ---------------------------------------------------------------------------
function extractEmail(raw: UnknownRecord): string {
  return (
    str(raw, "email", "Email", "EMAIL", "e-mail", "E-mail") || ""
  )
    .toLowerCase()
    .trim();
}

// ---------------------------------------------------------------------------
// buildStructuredProfile – full canonical profile from any raw object.
// Always call this on the DEEPEST unwrapped raw, never on a full document.
// ---------------------------------------------------------------------------
export function buildStructuredProfile(raw: UnknownRecord): StructuredProfile {
  const { firstName, lastName } = extractName(raw);

  const skills = parseSkills(raw.skills);
  const experiences = parseExperience(raw.experience).length
    ? parseExperience(raw.experience)
    : parseExperience(raw.experiences);
  const educations = parseEducation(raw.education).length
    ? parseEducation(raw.education)
    : parseEducation(raw.educations);
  const certifications = parseCertifications(raw.certifications).length
    ? parseCertifications(raw.certifications)
    : parseCertifications(raw.certificates);
  const projects = parseProjects(raw.projects);

  let socialLinks = parseSocialLinks(raw.socialLinks ?? raw.social_links);
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    socialLinks = parseSocialLinks(raw.links);
  }

  const headline =
    str(raw, "headline", "Headline", "title", "Title") ||
    str(raw, "bio", "Bio", "summary", "Summary") ||
    undefined;

  const bio =
    str(raw, "bio", "Bio", "summary", "Summary") || undefined;

  const location =
    str(raw, "location", "Location", "city", "City", "address") || undefined;

  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: extractEmail(raw),
    headline,
    bio,
    location,
    skills,
    languages: parseLanguages(raw.languages),
    experience: experiences,
    education: educations,
    certifications,
    projects,
    availability: parseAvailability(raw.availability) ?? {
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

// ---------------------------------------------------------------------------
// normalizeApplicantPayload – top-level entry point for all API routes.
//
// KEY FIXES:
// 1. Always unwrap to the deepest raw source before processing – this
//    prevents the education / skill corruption that accumulated on every
//    re-save when the entire applicant document was passed as "raw".
// 2. Stores only the clean, flat source fields in profileData.raw –
//    no nesting of previous profileData objects.
// ---------------------------------------------------------------------------
export const normalizeApplicantPayload = (raw: UnknownRecord) => {
  // --- Step 1: Reach original source data, skipping any prior wrapping ---
  const sourceRaw = unwrapToDeepestRaw(raw);

  const { firstName, lastName, fullName } = extractName(sourceRaw);
  const email = extractEmail(sourceRaw);

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const cleanName = fullName.toLowerCase().replace(/\s+/g, ".");
  const fallbackEmail = `${cleanName}.${randomSuffix}@unknown.local`;
  const resolvedEmail = email || fallbackEmail;

  // --- Step 2: Build structured profile from deepest raw only ---
  const structuredProfile = buildStructuredProfile(sourceRaw);

  // --- Step 3: Calculate years of experience ---
  const yearsFromExperienceObjects = (
    structuredProfile.experience ?? []
  ).reduce((acc, entry) => {
    const startStr = String(entry.startDate || "");
    const endStr = String(entry.endDate || "");
    if (!startStr) return acc;

    let start = new Date(`${startStr}-01`);
    if (isNaN(start.getTime())) start = new Date(startStr);

    let end = new Date();
    if (endStr && endStr.toLowerCase() !== "present") {
      end = new Date(`${endStr}-01`);
      if (isNaN(end.getTime())) end = new Date(endStr);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
    return (
      acc +
      Math.max(
        0,
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)
      )
    );
  }, 0);

  const yearsDirect = Number(
    sourceRaw.yearsOfExperience ??
      sourceRaw.experienceYears ??
      sourceRaw["Years of Experience"] ??
      sourceRaw["years_of_experience"] ??
      0
  );
  const yearsOfExperience =
    yearsDirect > 0
      ? yearsDirect
      : Math.max(0, Math.round(yearsFromExperienceObjects));

  // --- Step 4: Flat education string (for top-level field) ---
  const education =
    Array.isArray(structuredProfile.education) &&
    structuredProfile.education.length > 0
      ? structuredProfile.education
          .map(
            (e) =>
              `${e.degree || ""}${
                e.institution ? ` at ${e.institution}` : ""
              }`.trim()
          )
          .join(" | ")
      : str(sourceRaw, "education", "Education") || "Not provided";

  const skills =
    structuredProfile.skills?.map((s) => s.name).filter(Boolean) ?? [];

  const summary =
    str(sourceRaw, "headline", "Headline", "title") ||
    str(sourceRaw, "bio", "Bio", "summary", "Summary") ||
    "";

  // --- Step 5: Strip metadata from what we store as profileData.raw ---
  // This prevents the nesting bug: we only keep the clean source fields.
  const {
    profileData: _pd,
    structuredProfile: _sp,
    _id: _id,
    createdAt: _ca,
    updatedAt: _ua,
    __v: _v,
    isDuplicate: _isd,
    duplicateOf: _do,
    ...storableRaw
  } = sourceRaw as UnknownRecord & {
    profileData?: unknown;
    structuredProfile?: unknown;
    _id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    __v?: unknown;
    isDuplicate?: unknown;
    duplicateOf?: unknown;
  };

  return {
    fullName,
    email: resolvedEmail,
    phone:
      str(
        sourceRaw,
        "phone",
        "Phone",
        "phoneNumber",
        "phone_number"
      ) || undefined,
    yearsOfExperience,
    education,
    skills,
    summary,
    resumeText:
      str(sourceRaw, "resumeText", "resumetext", "resume_text") || undefined,
    source: String(sourceRaw.source ?? raw.source ?? "json") as
      | "json"
      | "csv"
      | "excel"
      | "pdf",
    structuredProfile,
    profileData: {
      raw: storableRaw,
      parseDate: new Date().toISOString(),
    },
  };
};