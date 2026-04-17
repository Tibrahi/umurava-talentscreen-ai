// Shared domain types keep client and server contracts in sync.
// This prevents drift between API responses, Redux cache, and UI rendering logic.
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type LanguageProficiency = "Basic" | "Conversational" | "Fluent" | "Native";
export type AvailabilityStatus = "Available" | "Open to Opportunities" | "Not Available";
export type EmploymentType = "Full-time" | "Part-time" | "Contract";

// Job types
export interface JobInput {
  title: string;
  description: string;
  requiredSkills: string[];
  minimumExperience: number;
  education: string;
  location: string;
  employmentType: string;
}

export interface Job extends JobInput {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// Canonical structured profile (follows schema blueprint)
export interface Skill {
  name: string;
  level?: SkillLevel;
  yearsOfExperience?: number;
}

export interface Language {
  name: string;
  proficiency?: LanguageProficiency;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM or "Present"
  description?: string;
  technologies?: string[];
  isCurrent?: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
}

export interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string; // YYYY-MM
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  role?: string;
  link?: string;
  startDate?: string; // YYYY-MM
  endDate?: string; // YYYY-MM
}

export interface Availability {
  status?: AvailabilityStatus;
  type?: EmploymentType;
  startDate?: string; // YYYY-MM-DD
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface StructuredProfile {
  firstName?: string;
  lastName?: string;
  email: string;
  headline?: string;
  bio?: string;
  location?: string;
  skills?: Skill[];
  languages?: Language[];
  experience?: Experience[];
  education?: Education[];
  certifications?: Certification[];
  projects?: Project[];
  availability?: Availability;
  socialLinks?: SocialLinks;
}

export interface ApplicantInput {
  fullName: string;
  email: string;
  phone?: string;
  yearsOfExperience: number;
  education: string;
  skills: string[];
  summary?: string;
  resumeText?: string;
  source: "json" | "csv" | "excel" | "pdf";
  profileData?: Record<string, unknown>;
  structuredProfile?: StructuredProfile;
  duplicateOf?: string; // Reference to original if duplicate
  isDuplicate?: boolean;
}

export interface Applicant extends ApplicantInput {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateInsight {
  applicantId: string;
  rank: number;
  matchScore: number;
  strengths: string[];
  gapsAndRisks: string[];
  explanation: string;
  recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
}

export interface ScreeningResult {
  _id: string;
  jobId: string;
  topN: 10 | 20;
  status: "processing" | "completed" | "failed";
  rankedCandidates: CandidateInsight[];
  createdAt: string;
  updatedAt: string;
}
