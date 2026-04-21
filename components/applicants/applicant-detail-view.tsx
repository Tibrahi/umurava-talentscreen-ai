"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Applicant, StructuredProfile } from "@/lib/types";
import {
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Globe,
  Calendar,
  X,
} from "lucide-react";

interface ApplicantDetailViewProps {
  applicant: Applicant;
  onClose?: () => void;
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate) return "No date";
  const start = new Date(startDate + "-01");
  const startStr = start.toLocaleDateString("en-US", { year: "numeric", month: "short" });

  if (!endDate || endDate === "Present") {
    return `${startStr} — Present`;
  }

  const end = new Date(endDate + "-01");
  const endStr = end.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  return `${startStr} — ${endStr}`;
}

/**
 * Format year range
 */
function formatYearRange(startYear?: number, endYear?: number): string {
  if (!startYear) return "No date";
  if (!endYear) return `${startYear}`;
  return `${startYear} — ${endYear}`;
}

/**
 * Skill proficiency badge color
 */
function getSkillLevelColor(level?: string): string {
  switch (level) {
    case "Expert":
      return "bg-red-100 text-red-800";
    case "Advanced":
      return "bg-blue-100 text-blue-800";
    case "Intermediate":
      return "bg-yellow-100 text-yellow-800";
    case "Beginner":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Language proficiency badge color
 */
function getLanguageProficiencyColor(proficiency?: string): string {
  switch (proficiency) {
    case "Native":
      return "bg-red-100 text-red-800";
    case "Fluent":
      return "bg-blue-100 text-blue-800";
    case "Conversational":
      return "bg-yellow-100 text-yellow-800";
    case "Basic":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Availability status badge color
 */
function getAvailabilityStatusColor(status?: string): string {
  switch (status) {
    case "Available":
      return "bg-green-100 text-green-800";
    case "Open to Opportunities":
      return "bg-blue-100 text-blue-800";
    case "Not Available":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Employment type badge color
 */
function getEmploymentTypeColor(type?: string): string {
  switch (type) {
    case "Full-time":
      return "bg-purple-100 text-purple-800";
    case "Part-time":
      return "bg-orange-100 text-orange-800";
    case "Contract":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Section header component
 */
function SectionHeader({ icon: Icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-200">
      {Icon}
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

/**
 * Main applicant detail view component
 */
export function ApplicantDetailView({ applicant, onClose }: ApplicantDetailViewProps) {
  let profile = applicant.structuredProfile as StructuredProfile | undefined;

  // Fallback: if no structured profile, create a basic one from flat fields
  if (!profile || (typeof profile === "object" && Object.keys(profile).length === 0)) {
    const nameParts = applicant.fullName?.split(" ") || ["Unknown"];
    profile = {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: applicant.email || "",
      headline: applicant.summary || "",
      location: "",
      skills: applicant.skills?.map((s) => ({ name: s })) || [],
      experience: [],
      education: [],
      languages: [],
      certifications: [],
      projects: [],
    };
  }

  // Create a new object to ensure extensibility
  const safeProfile: StructuredProfile = {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    location: profile.location || "",
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    availability: profile.availability,
    socialLinks: profile.socialLinks || {},
  };

  if (!safeProfile || !safeProfile.email) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">Error Loading Profile</h3>
        <p className="text-red-800 mb-4">Unable to load applicant profile data.</p>
        <p className="text-sm text-red-700 mb-4">
          Applicant: {applicant.fullName} ({applicant.email})
        </p>
        {onClose && (
          <Button onClick={onClose} className="mt-4" variant="outline">
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with close button */}
      <div className="flex justify-between items-start mb-6">
        <div />
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Basic Information Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {safeProfile.firstName} {safeProfile.lastName}
            </h1>
            {safeProfile.headline && (
              <p className="text-lg text-blue-600 font-medium mt-1">{safeProfile.headline}</p>
            )}
          </div>
        </div>

        {safeProfile.bio && (
          <p className="text-gray-700 leading-relaxed mb-4 max-w-2xl">{safeProfile.bio}</p>
        )}

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {safeProfile.email && (
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-blue-600" />
              <a href={`mailto:${safeProfile.email}`} className="hover:text-blue-600 underline">
                {safeProfile.email}
              </a>
            </div>
          )}
          {applicant.phone && (
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{applicant.phone}</span>
            </div>
          )}
          {safeProfile.location && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{safeProfile.location}</span>
            </div>
          )}
          {applicant.yearsOfExperience > 0 && (
            <div className="flex items-center gap-2 text-gray-700">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>{applicant.yearsOfExperience} years experience</span>
            </div>
          )}
        </div>

        {/* Social Links */}
        {safeProfile.socialLinks && (
          Object.values(safeProfile.socialLinks).some((v) => v) && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {safeProfile.socialLinks.github && (
                <a
                  href={safeProfile.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {safeProfile.socialLinks.linkedin && (
                <a
                  href={safeProfile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {safeProfile.socialLinks.portfolio && (
                <a
                  href={safeProfile.socialLinks.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <Globe className="w-4 h-4" />
                  Portfolio
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Availability */}
        {safeProfile.availability && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<Calendar className="w-5 h-5 text-green-600" />}
              title="Availability"
            />
            <div className="flex flex-wrap gap-3">
              {safeProfile.availability.status && (
                <Badge className={`${getAvailabilityStatusColor(safeProfile.availability.status)} font-medium`}>
                  {safeProfile.availability.status}
                </Badge>
              )}
              {safeProfile.availability.type && (
                <Badge className={`${getEmploymentTypeColor(safeProfile.availability.type)} font-medium`}>
                  {safeProfile.availability.type}
                </Badge>
              )}
              {safeProfile.availability.startDate && (
                <span className="text-sm text-gray-600">
                  Available from {new Date(safeProfile.availability.startDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {safeProfile.skills && safeProfile.skills.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<Code className="w-5 h-5 text-indigo-600" />}
              title="Skills"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {safeProfile.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900">{skill.name}</p>
                    {skill.yearsOfExperience !== undefined && (
                      <p className="text-xs text-gray-600">{skill.yearsOfExperience} years</p>
                    )}
                  </div>
                  {skill.level && (
                    <Badge className={`${getSkillLevelColor(skill.level)} ml-2 flex-shrink-0`}>
                      {skill.level}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {safeProfile.languages && safeProfile.languages.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<Globe className="w-5 h-5 text-amber-600" />}
              title="Languages"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {safeProfile.languages.map((lang, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-medium text-gray-900">{lang.name}</span>
                  {lang.proficiency && (
                    <Badge className={`${getLanguageProficiencyColor(lang.proficiency)}`}>
                      {lang.proficiency}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {safeProfile.experience && safeProfile.experience.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<Briefcase className="w-5 h-5 text-blue-600" />}
              title="Work Experience"
            />
            <div className="space-y-4">
              {safeProfile.experience.map((exp, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{exp.role}</h3>
                      <p className="text-blue-600 font-medium text-sm">{exp.company}</p>
                    </div>
                    {exp.isCurrent && (
                      <Badge className="bg-green-100 text-green-800">Current</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {formatDateRange(exp.startDate, exp.endDate)}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">{exp.description}</p>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {exp.technologies.map((tech, tidx) => (
                        <Badge key={tidx} className="bg-indigo-100 text-indigo-800 text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {safeProfile.education && safeProfile.education.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<GraduationCap className="w-5 h-5 text-purple-600" />}
              title="Education"
            />
            <div className="space-y-4">
              {safeProfile.education.map((edu, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                  <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                  <p className="text-purple-600 font-medium text-sm">{edu.institution}</p>
                  {edu.fieldOfStudy && (
                    <p className="text-sm text-gray-700">Field: {edu.fieldOfStudy}</p>
                  )}
                  {(edu.startYear || edu.endYear) && (
                    <p className="text-xs text-gray-600 mt-2">
                      {formatYearRange(edu.startYear, edu.endYear)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {safeProfile.certifications && safeProfile.certifications.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<Award className="w-5 h-5 text-orange-600" />}
              title="Certifications"
            />
            <div className="space-y-3">
              {safeProfile.certifications.map((cert, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                  <h3 className="font-medium text-gray-900">{cert.name}</h3>
                  {cert.issuer && (
                    <p className="text-sm text-gray-700">Issued by {cert.issuer}</p>
                  )}
                  {cert.issueDate && (
                    <p className="text-xs text-gray-600 mt-1">
                      Issued {new Date(cert.issueDate + "-01").toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {safeProfile.projects && safeProfile.projects.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader
              icon={<Code className="w-5 h-5 text-cyan-600" />}
              title="Projects"
            />
            <div className="space-y-4">
              {safeProfile.projects.map((proj, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{proj.name}</h3>
                      {proj.role && (
                        <p className="text-sm text-cyan-600 font-medium">{proj.role}</p>
                      )}
                    </div>
                  </div>
                  {proj.description && (
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">{proj.description}</p>
                  )}
                  {proj.startDate && (
                    <p className="text-xs text-gray-600 mb-2">
                      {formatDateRange(proj.startDate, proj.endDate || "")}
                    </p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {proj.technologies.map((tech, tidx) => (
                        <Badge key={tidx} className="bg-cyan-100 text-cyan-800 text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {proj.link && (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Project
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {safeProfile.skills?.length || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">Skills</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {safeProfile.experience?.length || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">Experiences</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {safeProfile.education?.length || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">Education</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {safeProfile.projects?.length || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">Projects</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Source:</span> {applicant.source}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Added:</span>{" "}
              {new Date(applicant.createdAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Updated:</span>{" "}
              {new Date(applicant.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
