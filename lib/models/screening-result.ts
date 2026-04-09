import mongoose, { Schema, type Model } from "mongoose";

export interface RankedCandidateDocument {
  applicantId: mongoose.Types.ObjectId;
  rank: number;
  matchScore: number;
  strengths: string[];
  gapsAndRisks: string[];
  explanation: string;
  recommendation: "Strongly Recommend" | "Recommend" | "Consider" | "Do Not Recommend";
}

export interface ScreeningResultDocument extends mongoose.Document {
  jobId: mongoose.Types.ObjectId;
  topN: 10 | 20;
  status: "processing" | "completed" | "failed";
  rankedCandidates: RankedCandidateDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const RankedCandidateSchema = new Schema<RankedCandidateDocument>(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true },
    rank: { type: Number, required: true, min: 1 },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    strengths: [{ type: String, required: true }],
    gapsAndRisks: [{ type: String, required: true }],
    explanation: { type: String, required: true },
    recommendation: {
      type: String,
      enum: ["Strongly Recommend", "Recommend", "Consider", "Do Not Recommend"],
      required: true,
    },
  },
  { _id: false }
);

const ScreeningResultSchema = new Schema<ScreeningResultDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    topN: { type: Number, enum: [10, 20], required: true },
    status: { type: String, enum: ["processing", "completed", "failed"], required: true },
    rankedCandidates: [RankedCandidateSchema],
  },
  { timestamps: true }
);

ScreeningResultSchema.index({ jobId: 1, createdAt: -1 });

export const ScreeningResultModel: Model<ScreeningResultDocument> =
  mongoose.models.ScreeningResult ||
  mongoose.model<ScreeningResultDocument>("ScreeningResult", ScreeningResultSchema);
