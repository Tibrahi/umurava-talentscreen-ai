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
    profileData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ApplicantSchema.index({ email: 1 }, { unique: true });

export const ApplicantModel: Model<ApplicantDocument> =
  mongoose.models.Applicant ||
  mongoose.model<ApplicantDocument>("Applicant", ApplicantSchema);
