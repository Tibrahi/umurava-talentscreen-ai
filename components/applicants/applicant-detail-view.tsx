"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Applicant, StructuredProfile } from "@/lib/types";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  Calendar,
  X,
  CheckCircle2
} from "lucide-react";

interface ApplicantDetailViewProps {
  applicant: Applicant;
  onClose?: () => void;
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return "Timeline not specified";
  const start = new Date(startDate + "-01");
  const startStr = isNaN(start.getTime()) ? startDate : start.toLocaleDateString("en-US", { year: "numeric", month: "short" });

  if (!endDate || endDate === "Present") {
    return `${startStr} — Present`;
  }

  const end = new Date(endDate + "-01");
  const endStr = isNaN(end.getTime()) ? endDate : end.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  return `${startStr} — ${endStr}`;
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
    ...profile,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div />
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200" aria-label="Close">
            <X className="w-6 h-6 text-black" />
          </button>
        )}
      </div>

      {/* Header Profile Card - Black & White aesthetic */}
      <div className="bg-black text-white rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              {safeProfile.firstName} {safeProfile.lastName}
            </h1>
            {safeProfile.headline && <p className="text-xl text-green-400 font-medium mt-2">{safeProfile.headline}</p>}
          </div>
        </div>

        {safeProfile.bio && <p className="text-gray-300 leading-relaxed mb-6 max-w-3xl">{safeProfile.bio}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-800">
          {safeProfile.email && (
            <div className="flex items-center gap-3 text-gray-200 hover:text-white transition">
              <Mail className="w-5 h-5 text-green-400" />
              <a href={`mailto:${safeProfile.email}`} className="font-medium">{safeProfile.email}</a>
            </div>
          )}
          {applicant.phone && (
            <div className="flex items-center gap-3 text-gray-200 hover:text-white transition">
              <Phone className="w-5 h-5 text-green-400" />
              <span className="font-medium">{applicant.phone}</span>
            </div>
          )}
          {safeProfile.location && (
            <div className="flex items-center gap-3 text-gray-200">
              <MapPin className="w-5 h-5 text-green-400" />
              <span className="font-medium">{safeProfile.location}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-gray-200">
            <Briefcase className="w-5 h-5 text-green-400" />
            <span className="font-medium">{applicant.yearsOfExperience} years of experience</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Work Experience */}
        {safeProfile.experience && safeProfile.experience.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="p-2 bg-green-50 rounded-lg"><Briefcase className="w-6 h-6 text-green-600" /></div>
              <h2 className="text-2xl font-bold text-black">Professional Experience</h2>
            </div>
            <div className="space-y-6">
              {safeProfile.experience.map((exp, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-green-100 pb-2">
                  <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[7px] top-2 border-2 border-white"></div>
                  <h3 className="text-xl font-bold text-black">{exp.role}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 mb-3">
                    <span className="text-green-700 font-semibold">{exp.company}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                      {formatDateRange(exp.startDate, exp.endDate)}
                    </span>
                  </div>
                  {exp.description && <p className="text-gray-600 leading-relaxed mb-4">{exp.description}</p>}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {exp.technologies.map((tech, i) => (
                        <Badge key={i} className="bg-black text-white hover:bg-gray-800">{tech}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education - Unified Degree Elements */}
        {safeProfile.education && safeProfile.education.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="p-2 bg-green-50 rounded-lg"><GraduationCap className="w-6 h-6 text-green-600" /></div>
              <h2 className="text-2xl font-bold text-black">Education</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {safeProfile.education.map((edu, idx) => (
                <div key={idx} className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="text-lg font-bold text-black mb-1">{edu.degree}</h3>
                  <p className="text-green-700 font-semibold mb-2">{edu.institution}</p>
                  {edu.fieldOfStudy && (
                    <p className="text-sm text-gray-600 mb-2">Field of Study: <span className="font-medium text-black">{edu.fieldOfStudy}</span></p>
                  )}
                  {(edu.startYear || edu.endYear) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">
                        {edu.startYear || "N/A"} — {edu.endYear || "Present"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills - Detailed UI */}
        {safeProfile.skills && safeProfile.skills.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="p-2 bg-green-50 rounded-lg"><Code className="w-6 h-6 text-green-600" /></div>
              <h2 className="text-2xl font-bold text-black">Technical Skills</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {safeProfile.skills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="font-bold text-black">{skill.name}</p>
                    {skill.level && <p className="text-xs font-medium text-green-600 mt-0.5">{skill.level}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}