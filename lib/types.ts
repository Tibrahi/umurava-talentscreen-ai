// Shared domain types keep client and server contracts in sync.
// This prevents drift between API responses, Redux cache, and UI rendering logic.
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";

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
