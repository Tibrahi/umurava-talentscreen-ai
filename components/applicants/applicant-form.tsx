"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { validateStructuredProfile, formatValidationErrors, type ValidationError } from "@/lib/validation";
import type { Applicant, StructuredProfile } from "@/lib/types";

interface ApplicantFormProps {
  applicant?: Applicant;
  onSubmit: (data: StructuredProfile) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ApplicantForm({
  applicant,
  onSubmit,
  onCancel,
  isLoading = false,
}: ApplicantFormProps) {
  const initialProfile: StructuredProfile = applicant?.structuredProfile
    ? (applicant.structuredProfile as StructuredProfile)
    : {
        email: "",
        firstName: "",
        lastName: "",
      };

  const [formData, setFormData] = useState<Partial<StructuredProfile>>(initialProfile);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      } as Partial<StructuredProfile>));

      // Validate on change for email
      if (field === "email") {
        const validation = validateStructuredProfile({
          ...formData,
          [field]: value,
        } as Record<string, unknown>);
        setErrors(validation.errors.filter((e) => e.field === "email"));
      }
    },
    [formData]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        setIsSubmitting(true);

        // Full validation
        const validation = validateStructuredProfile(formData);
        setErrors(validation.errors);
        setWarnings(validation.warnings);

        if (!validation.isValid) {
          return;
        }

        // Submit
        await onSubmit(formData as StructuredProfile);
      } catch (error) {
        console.error("Form submission error:", error);
        setErrors([
          {
            field: "general",
            message: error instanceof Error ? error.message : "An error occurred",
            severity: "error",
          },
        ]);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit]
  );

  const errorCount = errors.filter((e) => e.severity === "error").length;

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Summary */}
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Validation Errors ({errorCount})</h3>
                <ul className="mt-2 space-y-1 text-sm text-red-800">
                  {errors
                    .filter((e) => e.severity === "error")
                    .map((err, idx) => (
                      <li key={idx}>
                        <strong>{err.field}:</strong> {err.message}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warning Summary */}
        {warnings.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Recommendations</h3>
                <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                  {warnings.map((warn, idx) => (
                    <li key={idx}>
                      <strong>{warn.field}:</strong> {warn.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900">Basic Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName || ""}
                onChange={(e) => handleChange("firstName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName || ""}
                onChange={(e) => handleChange("lastName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john.doe@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={formData.headline || ""}
              onChange={(e) => handleChange("headline", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Senior Full Stack Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio || ""}
              onChange={(e) => handleChange("bio", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ""}
              onChange={(e) => handleChange("location", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="San Francisco, CA"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900">Social Links</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.socialLinks?.linkedin || ""}
              onChange={(e) =>
                handleChange("socialLinks", {
                  ...formData.socialLinks,
                  linkedin: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub
            </label>
            <input
              type="url"
              value={formData.socialLinks?.github || ""}
              onChange={(e) =>
                handleChange("socialLinks", {
                  ...formData.socialLinks,
                  github: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio
            </label>
            <input
              type="url"
              value={formData.socialLinks?.portfolio || ""}
              onChange={(e) =>
                handleChange("socialLinks", {
                  ...formData.socialLinks,
                  portfolio: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://yourportfolio.com"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || errorCount > 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting || isLoading ? "Saving..." : applicant ? "Update Profile" : "Create Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
