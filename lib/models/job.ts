import mongoose, { Schema, type Model } from "mongoose";

export interface JobDocument extends mongoose.Document {
  title: string;
  description: string;
  requiredSkills: string[];
  minimumExperience: number;
  education: string;
  location: string;
  employmentType: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<JobDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requiredSkills: [{ type: String, required: true }],
    minimumExperience: { type: Number, required: true, min: 0 },
    education: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    employmentType: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const JobModel: Model<JobDocument> =
  mongoose.models.Job || mongoose.model<JobDocument>("Job", JobSchema);
