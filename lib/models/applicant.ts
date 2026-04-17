import mongoose, { Schema, type Model } from "mongoose";

// Nested schema definitions for structured profile
const SkillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
    yearsOfExperience: Number,
  },
  { _id: false }
);

const LanguageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    proficiency: { type: String, enum: ["Basic", "Conversational", "Fluent", "Native"] },
  },
  { _id: false }
);

const ExperienceSchema = new Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    startDate: { type: String, required: true }, // YYYY-MM
    endDate: { type: String, required: true }, // YYYY-MM or "Present"
    description: { type: String, trim: true },
    technologies: [{ type: String, trim: true }],
    isCurrent: Boolean,
  },
  { _id: false }
);

const EducationSchema = new Schema(
  {
    institution: { type: String, required: true, trim: true },
    degree: { type: String, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startYear: Number,
    endYear: Number,
  },
  { _id: false }
);

const CertificationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    issueDate: String, // YYYY-MM
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    technologies: [{ type: String, trim: true }],
    role: { type: String, trim: true },
    link: String,
    startDate: String, // YYYY-MM
    endDate: String, // YYYY-MM
  },
  { _id: false }
);

const AvailabilitySchema = new Schema(
  {
    status: { type: String, enum: ["Available", "Open to Opportunities", "Not Available"] },
    type: { type: String, enum: ["Full-time", "Part-time", "Contract"] },
    startDate: String, // YYYY-MM-DD
  },
  { _id: false }
);

const SocialLinksSchema = new Schema(
  {
    linkedin: String,
    github: String,
    portfolio: String,
  },
  { _id: false }
);

const StructuredProfileSchema = new Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    headline: { type: String, trim: true },
    bio: { type: String, trim: true },
    location: { type: String, trim: true },
    skills: [SkillSchema],
    languages: [LanguageSchema],
    experience: [ExperienceSchema],
    education: [EducationSchema],
    certifications: [CertificationSchema],
    projects: [ProjectSchema],
    availability: AvailabilitySchema,
    socialLinks: SocialLinksSchema,
  },
  { _id: false }
);

export interface ApplicantDocument extends mongoose.Document {
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
  structuredProfile?: Record<string, unknown>;
  duplicateOf?: mongoose.Types.ObjectId;
  isDuplicate?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema = new Schema<ApplicantDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    yearsOfExperience: { type: Number, required: true, min: 0 },
    education: { type: String, required: true, trim: true },
    skills: [{ type: String, required: true }],
    summary: { type: String, trim: true },
    resumeText: { type: String },
    source: { type: String, enum: ["json", "csv", "excel", "pdf"], required: true },
    profileData: { type: Schema.Types.Mixed }, // Raw/unstructured data from source
    structuredProfile: StructuredProfileSchema, // Canonical structured profile with full schema validation
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Applicant", default: null },
    isDuplicate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ApplicantSchema.index({ email: 1 }, { unique: true });
ApplicantSchema.index({ isDuplicate: 1 });
ApplicantSchema.index({ duplicateOf: 1 });

export const ApplicantModel: Model<ApplicantDocument> =
  mongoose.models.Applicant ||
  mongoose.model<ApplicantDocument>("Applicant", ApplicantSchema);
