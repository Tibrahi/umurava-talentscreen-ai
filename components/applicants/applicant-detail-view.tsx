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
  Database,
} from "lucide-react";

interface ApplicantDetailViewProps {
  applicant: Applicant;
  onClose?: () => void;
}

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

function formatYearRange(startYear?: number, endYear?: number): string {
  if (!startYear) return "No date";
  if (!endYear) return `${startYear}`;
  return `${startYear} — ${endYear}`;
}

function getSkillLevelColor(level?: string): string {
  switch (level) {
    case "Expert": return "bg-red-100 text-red-800";
    case "Advanced": return "bg-blue-100 text-blue-800";
    case "Intermediate": return "bg-yellow-100 text-yellow-800";
    case "Beginner": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getLanguageProficiencyColor(proficiency?: string): string {
  switch (proficiency) {
    case "Native": return "bg-red-100 text-red-800";
    case "Fluent": return "bg-blue-100 text-blue-800";
    case "Conversational": return "bg-yellow-100 text-yellow-800";
    case "Basic": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getAvailabilityStatusColor(status?: string): string {
  switch (status) {
    case "Available": return "bg-green-100 text-green-800";
    case "Open to Opportunities": return "bg-blue-100 text-blue-800";
    case "Not Available": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getEmploymentTypeColor(type?: string): string {
  switch (type) {
    case "Full-time": return "bg-purple-100 text-purple-800";
    case "Part-time": return "bg-orange-100 text-orange-800";
    case "Contract": return "bg-indigo-100 text-indigo-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function SectionHeader({ icon: Icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-200">
      {Icon}
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

export function ApplicantDetailView({ applicant, onClose }: ApplicantDetailViewProps) {
  let profile = applicant.structuredProfile as StructuredProfile | undefined;

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
        <p className="text-sm text-red-700 mb-4">Applicant: {applicant.fullName} ({applicant.email})</p>
        {onClose && <Button onClick={onClose} className="mt-4" variant="outline">Close</Button>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div />
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {safeProfile.firstName} {safeProfile.lastName}
            </h1>
            {safeProfile.headline && <p className="text-lg text-blue-600 font-medium mt-1">{safeProfile.headline}</p>}
          </div>
        </div>

        {safeProfile.bio && <p className="text-gray-700 leading-relaxed mb-4 max-w-2xl">{safeProfile.bio}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {safeProfile.email && (
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-blue-600" />
              <a href={`mailto:${safeProfile.email}`} className="hover:text-blue-600 underline">{safeProfile.email}</a>
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
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Availability */}
        {safeProfile.availability && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader icon={<Calendar className="w-5 h-5 text-green-600" />} title="Availability" />
            <div className="flex flex-wrap gap-3">
              {safeProfile.availability.status && (
                <Badge className={`${getAvailabilityStatusColor(safeProfile.availability.status)} font-medium`}>{safeProfile.availability.status}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {safeProfile.skills && safeProfile.skills.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader icon={<Code className="w-5 h-5 text-indigo-600" />} title="Skills" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {safeProfile.skills.map((skill, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900">{skill.name}</p>
                  </div>
                  {skill.level && <Badge className={`${getSkillLevelColor(skill.level)} ml-2 flex-shrink-0`}>{skill.level}</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {safeProfile.experience && safeProfile.experience.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader icon={<Briefcase className="w-5 h-5 text-blue-600" />} title="Work Experience" />
            <div className="space-y-4">
              {safeProfile.experience.map((exp, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{exp.role}</h3>
                      <p className="text-blue-600 font-medium text-sm">{exp.company}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{formatDateRange(exp.startDate, exp.endDate)}</p>
                  {exp.description && <p className="text-sm text-gray-700 leading-relaxed mb-2">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {safeProfile.education && safeProfile.education.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader icon={<GraduationCap className="w-5 h-5 text-purple-600" />} title="Education" />
            <div className="space-y-4">
              {safeProfile.education.map((edu, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                  <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                  <p className="text-purple-600 font-medium text-sm">{edu.institution}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CRITICAL FIX: The Raw MongoDB Database Output */}
        {applicant.profileData && Object.keys(applicant.profileData).length > 0 && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
            <SectionHeader icon={<Database className="w-5 h-5 text-gray-600" />} title="Raw Database Entry (Atlas)" />
            <p className="text-xs text-gray-500 mb-4">Complete raw data extracted exactly as it was provided from the source file.</p>
            <pre className="text-xs bg-white p-4 rounded-lg border border-gray-200 overflow-auto max-h-96 text-gray-800 font-mono shadow-inner">
              {JSON.stringify(applicant.profileData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}