import type { Applicant } from "./types";

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance normalized by max length
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Normalize name for comparison (remove titles, extra spaces, etc)
 */
function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(mr|mrs|ms|dr|prof|ing)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract domain from email
 */
function getEmailDomain(email: string): string {
  return email.split("@")[1] || "";
}

/**
 * Deep comparison of all parsed data fields
 */
function compareAllParsedData(applicant1: Applicant, applicant2: Applicant): number {
  let matchedFields = 0;
  let totalFields = 0;

  // Get all top-level fields from both applicants
  const fields = new Set<string>();
  Object.keys(applicant1).forEach((k) => fields.add(k));
  Object.keys(applicant2).forEach((k) => fields.add(k));

  // Compare each field
  for (const field of fields) {
    if (
      field === "_id" ||
      field === "createdAt" ||
      field === "updatedAt" ||
      field === "isDuplicate" ||
      field === "duplicateOf"
    ) {
      continue; // Skip metadata fields
    }

    const val1 = applicant1[field as keyof Applicant];
    const val2 = applicant2[field as keyof Applicant];

    if (val1 === undefined || val2 === undefined) continue;

    totalFields++;

    // Handle arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length === val2.length) {
        const items1 = val1.map((v) => JSON.stringify(v).toLowerCase()).sort();
        const items2 = val2.map((v) => JSON.stringify(v).toLowerCase()).sort();
        if (JSON.stringify(items1) === JSON.stringify(items2)) {
          matchedFields++;
        }
      }
    }
    // Handle objects
    else if (typeof val1 === "object" && typeof val2 === "object" && val1 !== null && val2 !== null) {
      if (JSON.stringify(val1).toLowerCase() === JSON.stringify(val2).toLowerCase()) {
        matchedFields++;
      }
    }
    // Handle strings and primitives
    else if (typeof val1 === "string" || typeof val1 === "number") {
      const str1 = String(val1).toLowerCase().trim();
      const str2 = String(val2).toLowerCase().trim();
      if (str1 === str2) {
        matchedFields++;
      } else {
        // Check similarity for string fields
        const similarity = stringSimilarity(str1, str2);
        if (similarity > 0.85) matchedFields += similarity;
      }
    }
  }

  return totalFields > 0 ? matchedFields / totalFields : 0;
}

/**
 * Check if two applicants might be duplicates
 * Returns similarity score (0-1)
 * Compares ALL parsed data, not just skills
 */
export function calculateDuplicateSimilarity(applicant1: Applicant, applicant2: Applicant): number {
  if (applicant1._id === applicant2._id) return 0; // Same person, not a duplicate

  let score = 0;
  let weightSum = 0;

  // Email match (highest weight)
  if (applicant1.email && applicant2.email) {
    if (applicant1.email === applicant2.email) {
      return 1; // Exact email match = definite duplicate
    }
    const emailSimilarity = stringSimilarity(applicant1.email, applicant2.email);
    score += emailSimilarity * 0.35;
    weightSum += 0.35;
  }

  // Name match (high weight)
  if (applicant1.fullName && applicant2.fullName) {
    const normalizedName1 = normalizeNameForComparison(applicant1.fullName);
    const normalizedName2 = normalizeNameForComparison(applicant2.fullName);
    const nameSimilarity = stringSimilarity(normalizedName1, normalizedName2);
    score += nameSimilarity * 0.3;
    weightSum += 0.3;
  }

  // Phone match (medium weight)
  if (applicant1.phone && applicant2.phone) {
    const phone1 = applicant1.phone.replace(/\D/g, "");
    const phone2 = applicant2.phone.replace(/\D/g, "");
    if (phone1 && phone2 && phone1 === phone2) {
      score += 0.25;
      weightSum += 0.25;
    }
  }

  // Skills overlap (medium weight)
  if (applicant1.skills?.length && applicant2.skills?.length) {
    const skills1 = new Set(applicant1.skills.map((s) => s.toLowerCase()));
    const skills2 = new Set(applicant2.skills.map((s) => s.toLowerCase()));
    const intersection = [...skills1].filter((s) => skills2.has(s)).length;
    const union = new Set([...skills1, ...skills2]).size;
    const skillsSimilarity = union > 0 ? intersection / union : 0;
    score += skillsSimilarity * 0.15;
    weightSum += 0.15;
  }

  // Deep comparison of ALL parsed data (new - most important)
  const parsedDataSimilarity = compareAllParsedData(applicant1, applicant2);
  score += parsedDataSimilarity * 0.3;
  weightSum += 0.3;

  // Also check structured profiles if they exist
  if (applicant1.structuredProfile && applicant2.structuredProfile) {
    const struct1 = applicant1.structuredProfile as Record<string, unknown>;
    const struct2 = applicant2.structuredProfile as Record<string, unknown>;
    const structJson1 = JSON.stringify(struct1).toLowerCase();
    const structJson2 = JSON.stringify(struct2).toLowerCase();
    if (structJson1 === structJson2) {
      score += 0.35;
      weightSum += 0.35;
    }
  }

  return Math.min(weightSum > 0 ? score / weightSum : 0, 1);
}

/**
 * Detect potential duplicates in a list of applicants
 * Returns groups of similar applicants
 */
export function detectDuplicates(
  applicants: Applicant[],
  similarityThreshold: number = 0.7
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const processed = new Set<string>();

  for (const applicant of applicants) {
    if (processed.has(applicant._id)) continue;

    const group = [applicant._id];
    processed.add(applicant._id);

    for (const other of applicants) {
      if (processed.has(other._id) || applicant._id === other._id) continue;

      const similarity = calculateDuplicateSimilarity(applicant, other);
      if (similarity >= similarityThreshold) {
        group.push(other._id);
        processed.add(other._id);
      }
    }

    if (group.length > 1) {
      groups.set(applicant._id, group);
    }
  }

  return groups;
}

/**
 * Merge two applicants, keeping the more complete one as primary
 */
export function mergeApplicants(primary: Applicant, secondary: Applicant): Applicant {
  const mergedStructuredProfile: any = {
    ...primary.structuredProfile,
    ...secondary.structuredProfile,
    email: primary.email, // Keep primary email
    experience: [
      ...(Array.isArray(primary.structuredProfile?.experience)
        ? primary.structuredProfile.experience
        : []),
      ...(Array.isArray(secondary.structuredProfile?.experience)
        ? secondary.structuredProfile.experience
        : []),
    ],
    education: [
      ...(Array.isArray(primary.structuredProfile?.education)
        ? primary.structuredProfile.education
        : []),
      ...(Array.isArray(secondary.structuredProfile?.education)
        ? secondary.structuredProfile.education
        : []),
    ],
    skills: [
      ...(Array.isArray(primary.structuredProfile?.skills)
        ? primary.structuredProfile.skills
        : []),
      ...(Array.isArray(secondary.structuredProfile?.skills)
        ? secondary.structuredProfile.skills
        : []),
    ],
  };

  return {
    ...primary,
    // Prefer non-empty fields from secondary
    phone: primary.phone || secondary.phone,
    summary: primary.summary || secondary.summary,
    skills: [...new Set([...(primary.skills || []), ...(secondary.skills || [])])],
    // Merge structured profiles
    structuredProfile: mergedStructuredProfile,
  };
}
