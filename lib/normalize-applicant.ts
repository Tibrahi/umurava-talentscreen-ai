type UnknownRecord = Record<string, unknown>;

// Central normalization keeps structured JSON/CSV/Excel/PDF ingestion consistent.
// This prevents schema cast errors and preserves rich source details in profileData.
export const normalizeApplicantPayload = (raw: UnknownRecord) => {
  const firstName = String(raw.firstName ?? "").trim();
  const lastName = String(raw.lastName ?? "").trim();
  const combinedName = `${firstName} ${lastName}`.trim();
  const nameCandidate = raw.fullName ?? raw.name ?? combinedName;
  const fullName = String(nameCandidate || "Unknown Candidate").trim();
  const email = String(
    raw.email ?? `${fullName.toLowerCase().replaceAll(" ", ".")}@unknown.local`
  )
    .trim()
    .toLowerCase();

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

  const education = Array.isArray(raw.education)
    ? raw.education
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(" | ")
    : typeof raw.education === "string"
      ? raw.education
      : "Not provided";

  const skills = Array.isArray(raw.skills)
    ? raw.skills.map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as UnknownRecord;
          return String(obj.name ?? JSON.stringify(item));
        }
        return JSON.stringify(item);
      })
    : typeof raw.skills === "string"
      ? raw.skills
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  const headline = typeof raw.headline === "string" ? raw.headline : "";
  const bio = typeof raw.bio === "string" ? raw.bio : "";
  const location = typeof raw.location === "string" ? raw.location : "";
  const summary = headline || bio || (typeof raw.summary === "string" ? raw.summary : "");

  return {
    fullName,
    email,
    phone: typeof raw.phone === "string" ? raw.phone : "",
    yearsOfExperience,
    education,
    skills,
    summary,
    resumeText: typeof raw.resumeText === "string" ? raw.resumeText : "",
    source: String(raw.source ?? "json") as "json" | "csv" | "excel" | "pdf",
    profileData: {
      firstName,
      lastName,
      headline,
      bio,
      location,
      experience: experienceArray,
      education: raw.education ?? [],
      certifications: raw.certifications ?? [],
      projects: raw.projects ?? [],
      availability: raw.availability ?? {},
      socialLinks: raw.socialLinks ?? {},
      languages: raw.languages ?? [],
      raw,
    },
  };
};
