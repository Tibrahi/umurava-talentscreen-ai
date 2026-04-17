/**
 * Applicant Data Validation & Error Handling
 * Ensures data integrity and provides meaningful error messages
 */

import type { StructuredProfile } from "./types";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date format (YYYY-MM or YYYY-MM-DD)
 */
export function validateDateFormat(date: string, format: "YYYY-MM" | "YYYY-MM-DD" = "YYYY-MM"): boolean {
  if (!date || typeof date !== "string") return false;
  if (date.toLowerCase() === "present") return true;
  const regex = format === "YYYY-MM" ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(date);
}

/**
 * Validate year (4-digit number between 1900 and next year)
 */
export function validateYear(year: number): boolean {
  if (!Number.isInteger(year)) return false;
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 10;
}

/**
 * Validate phone number (basic international format)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
  return phoneRegex;
}

/**
 * Validate years of experience
 */
export function validateYearsOfExperience(years: number): boolean {
  return Number.isInteger(years) && years >= 0 && years <= 80;
}

/**
 * Validate structured profile completeness
 */
export function validateStructuredProfile(profile: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  const email = profile.email as string | undefined;
  if (!email) {
    errors.push({
      field: "email",
      message: "Email is required",
      severity: "error",
    });
  } else if (!validateEmail(email)) {
    errors.push({
      field: "email",
      message: "Email format is invalid",
      severity: "error",
    });
  }

  const firstName = profile.firstName as string | undefined;
  const lastName = profile.lastName as string | undefined;
  if (!firstName && !lastName) {
    warnings.push({
      field: "name",
      message: "At least first or last name is recommended",
      severity: "warning",
    });
  }

  // Skills validation
  const skills = profile.skills as unknown[] | undefined;
  if (skills && Array.isArray(skills)) {
    skills.forEach((skill, idx) => {
      const skillObj = skill as Record<string, unknown> | undefined;
      if (!skillObj) return;
      const name = skillObj.name as string | undefined;
      if (!name || !name.trim()) {
        errors.push({
          field: `skills[${idx}].name`,
          message: "Skill name cannot be empty",
          severity: "error",
        });
      }
      const yearsOfExperience = skillObj.yearsOfExperience as number | undefined;
      if (yearsOfExperience !== undefined && !validateYearsOfExperience(yearsOfExperience)) {
        errors.push({
          field: `skills[${idx}].yearsOfExperience`,
          message: "Years of experience must be between 0 and 80",
          severity: "error",
        });
      }
    });
  }

  // Experience validation
  const experience = profile.experience as unknown[] | undefined;
  if (experience && Array.isArray(experience)) {
    experience.forEach((exp, idx) => {
      const expObj = exp as Record<string, unknown> | undefined;
      if (!expObj) return;
      const company = expObj.company as string | undefined;
      if (!company || !company.trim()) {
        errors.push({
          field: `experience[${idx}].company`,
          message: "Company name is required",
          severity: "error",
        });
      }
      const role = expObj.role as string | undefined;
      if (!role || !role.trim()) {
        errors.push({
          field: `experience[${idx}].role`,
          message: "Job role is required",
          severity: "error",
        });
      }
      const startDate = expObj.startDate as string | undefined;
      if (startDate && !validateDateFormat(startDate, "YYYY-MM")) {
        errors.push({
          field: `experience[${idx}].startDate`,
          message: "Start date must be in YYYY-MM format",
          severity: "error",
        });
      }
      const endDate = expObj.endDate as string | undefined;
      if (endDate && endDate !== "Present" && !validateDateFormat(endDate, "YYYY-MM")) {
        errors.push({
          field: `experience[${idx}].endDate`,
          message: 'End date must be in YYYY-MM format or "Present"',
          severity: "error",
        });
      }
    });
  }

  // Education validation
  const education = profile.education as unknown[] | undefined;
  if (education && Array.isArray(education)) {
    education.forEach((edu, idx) => {
      const eduObj = edu as Record<string, unknown> | undefined;
      if (!eduObj) return;
      const institution = eduObj.institution as string | undefined;
      if (!institution || !institution.trim()) {
        errors.push({
          field: `education[${idx}].institution`,
          message: "Institution name is required",
          severity: "error",
        });
      }
      const startYear = eduObj.startYear as number | undefined;
      if (startYear && !validateYear(startYear)) {
        errors.push({
          field: `education[${idx}].startYear`,
          message: "Start year must be between 1900 and next year",
          severity: "error",
        });
      }
      const endYear = eduObj.endYear as number | undefined;
      if (endYear && !validateYear(endYear)) {
        errors.push({
          field: `education[${idx}].endYear`,
          message: "End year must be between 1900 and next year",
          severity: "error",
        });
      }
      if (startYear && endYear && startYear > endYear) {
        errors.push({
          field: `education[${idx}]`,
          message: "Start year cannot be after end year",
          severity: "error",
        });
      }
    });
  }

  // Social links validation
  const socialLinks = profile.socialLinks as Record<string, unknown> | undefined;
  if (socialLinks && typeof socialLinks === "object") {
    const linkedin = socialLinks.linkedin as string | undefined;
    if (linkedin && !validateUrl(linkedin)) {
      errors.push({
        field: "socialLinks.linkedin",
        message: "LinkedIn URL is invalid",
        severity: "error",
      });
    }
    const github = socialLinks.github as string | undefined;
    if (github && !validateUrl(github)) {
      errors.push({
        field: "socialLinks.github",
        message: "GitHub URL is invalid",
        severity: "error",
      });
    }
    const portfolio = socialLinks.portfolio as string | undefined;
    if (portfolio && !validateUrl(portfolio)) {
      errors.push({
        field: "socialLinks.portfolio",
        message: "Portfolio URL is invalid",
        severity: "error",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation errors for user display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "No errors";
  return errors.map((err) => `${err.field}: ${err.message}`).join("\n");
}

/**
 * Check for data loss in normalized payload
 */
export function detectDataLoss(
  original: Record<string, unknown>,
  normalized: Record<string, unknown>
): ValidationError[] {
  const issues: ValidationError[] = [];

  // Check if critical fields are preserved
  const criticalFields = ["firstName", "lastName", "email", "skills", "experience", "education"];

  criticalFields.forEach((field) => {
    const originalValue = original[field];
    const normalizedValue = normalized[field];

    if (originalValue && !normalizedValue) {
      issues.push({
        field,
        message: `Field "${field}" was lost during normalization`,
        severity: "error",
      });
    }
  });

  // Check array preservation
  if (
    Array.isArray(original.skills) &&
    Array.isArray(normalized.skills)
  ) {
    const originalSkills = original.skills as unknown[];
    const normalizedSkills = normalized.skills as unknown[];
    if (originalSkills.length > normalizedSkills.length) {
      issues.push({
        field: "skills",
        message: `${
          originalSkills.length - normalizedSkills.length
        } skills were lost during normalization`,
        severity: "warning",
      });
    }
  }

  return issues;
}
