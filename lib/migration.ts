/**
 * Applicant Data Migration Utility
 * Ensures backward compatibility by migrating old applicants to new schema
 */

import { ApplicantModel } from "@/lib/models/applicant";
import { buildStructuredProfile } from "@/lib/normalize-applicant";

/**
 * Migrate an applicant to ensure structuredProfile exists
 */
export async function migrateApplicantToStructured(applicantId: string) {
  try {
    const applicant = await ApplicantModel.findById(applicantId);
    
    if (!applicant) {
      throw new Error("Applicant not found");
    }

    // If structuredProfile already exists and has content, return it
    if (applicant.structuredProfile && Object.keys(applicant.structuredProfile).length > 0) {
      return applicant;
    }

    // Reconstruct from available data
    let rawData: Record<string, unknown> = {};

    // Try to use profileData first (original uploaded format)
    if (applicant.profileData && typeof applicant.profileData === "object") {
      const profileData = applicant.profileData as Record<string, unknown>;
      if (profileData.raw && typeof profileData.raw === "object") {
        rawData = profileData.raw as Record<string, unknown>;
      }
    }

    // Fallback: build from flat fields
    if (!rawData || Object.keys(rawData).length === 0) {
      rawData = {
        firstName: applicant.fullName?.split(" ")[0] || "",
        lastName: applicant.fullName?.split(" ").slice(1).join(" ") || "",
        email: applicant.email,
        phone: applicant.phone,
        summary: applicant.summary,
        education: applicant.education,
        skills: applicant.skills,
        yearsOfExperience: applicant.yearsOfExperience,
      };
    }

    // Build structured profile - handles both new and legacy formats
    const structuredProfile = buildStructuredProfile(rawData);

    // Update applicant with structured profile
    const updated = await ApplicantModel.findByIdAndUpdate(
      applicantId,
      {
        $set: {
          structuredProfile,
        },
      },
      { new: true }
    );

    return updated;
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}

/**
 * Batch migrate all applicants without structuredProfile
 */
export async function batchMigrateApplicants() {
  try {
    const applicantsNeedingMigration = await ApplicantModel.find({
      $or: [
        { structuredProfile: { $exists: false } },
        { structuredProfile: null },
        { "structuredProfile.email": { $exists: false } },
      ],
    });

    const results = {
      total: applicantsNeedingMigration.length,
      successful: 0,
      failed: 0,
      errors: [] as { id: string; error: string }[],
    };

    for (const applicant of applicantsNeedingMigration) {
      try {
        await migrateApplicantToStructured(applicant._id.toString());
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: applicant._id.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Batch migration error:", error);
    throw error;
  }
}
