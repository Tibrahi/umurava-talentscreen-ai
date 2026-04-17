import mongoose, { Schema, type Model } from "mongoose";

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
    structuredProfile: { type: Schema.Types.Mixed }, // Canonical structured profile
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
