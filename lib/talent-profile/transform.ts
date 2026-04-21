type UnknownRecord = Record<string, unknown>;

export type TalentSkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface TalentSkill {
  name: string;
  level: TalentSkillLevel;
  yearsOfExperience: number;
}

export interface TalentExperience {
  company: string | null;
  role: string | null;
  startDate: string | null; // YYYY-MM
  endDate: string | null; // YYYY-MM or "Present"
  description: string | null;
  technologies: string[];
  isCurrent: boolean;
}

export interface TalentEducation {
  institution: string | null;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: number;
  endYear: number;
}

export interface TalentProject {
  name: string | null;
  description: string | null;
  technologies: string[];
  role: string | null;
  link: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface TalentSocialLinks {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
}

export interface TalentAvailability {
  status: "Open to Opportunities";
  type: "Full-time";
  startDate: string | null;
}

export interface TalentProfile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  headline: string | null;
  skills: TalentSkill[];
  experience: TalentExperience[];
  education: TalentEducation[];
  certifications: unknown[];
  projects: TalentProject[];
  socialLinks: TalentSocialLinks;
  availability: TalentAvailability;
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : String(v ?? "").trim()))
      .filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

function normalizeYYYYMM(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const str = value.trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (lower === "present" || lower === "current") return "Present";
  // Already YYYY-MM or YYYY-MM-DD
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) return str.slice(0, 7);
  // MM/YYYY or M/YYYY
  if (/^\d{1,2}\/\d{4}$/.test(str)) {
    const [m, y] = str.split("/");
    return `${y}-${m.padStart(2, "0")}`;
  }
  // MM/YYYY - sometimes in "MM-YYYY"
  if (/^\d{1,2}-\d{4}$/.test(str)) {
    const [m, y] = str.split("-");
    return `${y}-${m.padStart(2, "0")}`;
  }
  return null;
}

function toNumberOrZero(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeSkills(value: unknown): TalentSkill[] {
  if (!value) return [];
  if (!Array.isArray(value)) {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, level: "Intermediate", yearsOfExperience: 1 }));
    }
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, level: "Intermediate" as const, yearsOfExperience: 1 } : null;
      }
      if (!isRecord(item)) return null;
      const name = toNullableString(item.name) ?? toNullableString(item.skill) ?? toNullableString(item.title);
      if (!name) return null;

      const levelRaw = toNullableString(item.level);
      const level: TalentSkillLevel =
        levelRaw && ["Beginner", "Intermediate", "Advanced", "Expert"].includes(levelRaw)
          ? (levelRaw as TalentSkillLevel)
          : "Intermediate";

      const years = item.yearsOfExperience ?? item.years ?? item.experienceYears;
      const yearsOfExperience = Math.max(0, Math.floor(toNumberOrZero(years) || 1));

      return { name, level, yearsOfExperience };
    })
    .filter((s): s is TalentSkill => !!s);
}

function normalizeExperience(value: unknown): TalentExperience[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const company = toNullableString(item.company ?? item.Company);
      const role = toNullableString(item.role ?? item.Role ?? item.position ?? item.Position ?? item.title ?? item.Title);

      const startDate =
        normalizeYYYYMM(item.startDate ?? item.start_date ?? item["Start Date"] ?? item.from) ?? null;
      const endDate =
        normalizeYYYYMM(item.endDate ?? item.end_date ?? item["End Date"] ?? item.to) ??
        (toNullableString(item.endDate ?? item.end_date) ? null : null);

      const endDateFinal =
        endDate === null && (item.isCurrent === true || String(item.current ?? "").toLowerCase() === "true")
          ? "Present"
          : endDate;

      const isCurrent = endDateFinal === "Present";

      return {
        company,
        role,
        startDate,
        endDate: endDateFinal,
        description: toNullableString(item.description ?? item.Description),
        technologies: toStringArray(item.technologies ?? item.tech ?? item.stack),
        isCurrent,
      };
    })
    .filter((e): e is TalentExperience => !!e);
}

function normalizeEducation(value: unknown): TalentEducation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const startYear = Math.trunc(
        toNumberOrZero(item.startYear ?? item.start_year ?? item.startDate ?? item.fromYear)
      );
      const endYear = Math.trunc(toNumberOrZero(item.endYear ?? item.end_year ?? item.endDate ?? item.toYear));
      return {
        institution: toNullableString(item.institution ?? item.Institution ?? item.school ?? item.School),
        degree: toNullableString(item.degree ?? item.Degree),
        fieldOfStudy: toNullableString(item.fieldOfStudy ?? item.field_of_study ?? item.major ?? item.Field),
        startYear,
        endYear,
      };
    })
    .filter((e): e is TalentEducation => !!e);
}

function normalizeProjects(value: unknown): TalentProject[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      return {
        name: toNullableString(item.name ?? item.Name),
        description: toNullableString(item.description ?? item.Description),
        technologies: toStringArray(item.technologies ?? item.stack ?? item.tech),
        role: toNullableString(item.role ?? item.Role),
        link: toNullableString(item.link ?? item.Link ?? item.url ?? item.URL),
        startDate: normalizeYYYYMM(item.startDate ?? item.start_date),
        endDate: normalizeYYYYMM(item.endDate ?? item.end_date),
      };
    })
    .filter((p): p is TalentProject => !!p);
}

export function transformRawToTalentProfile(raw: unknown): TalentProfile {
  const r: UnknownRecord = isRecord(raw) ? raw : {};

  const firstName = toNullableString(r.firstName ?? r.first_name);
  const lastName = toNullableString(r.lastName ?? r.last_name);
  const email = toNullableString(r.email)?.toLowerCase() ?? null;

  // Rule 1: bio -> headline
  const headline = toNullableString(r.bio) ?? toNullableString(r.headline) ?? toNullableString(r.summary) ?? null;

  return {
    firstName,
    lastName,
    email,
    headline,
    skills: normalizeSkills(r.skills),
    experience: normalizeExperience(r.experience),
    education: normalizeEducation(r.education),
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    projects: normalizeProjects(r.projects),
    socialLinks: {
      linkedin: null,
      github: null,
      portfolio: null,
    },
    availability: {
      status: "Open to Opportunities",
      type: "Full-time",
      startDate: null,
    },
  };
}

