"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import type { Applicant, StructuredProfile } from "@/lib/types";
import {
  ExternalLink, Mail, Phone, MapPin, Briefcase, 
  GraduationCap, Award, Code, Globe, Calendar, CheckCircle2
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

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
    {icon}
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
  </div>
);

export function ApplicantDetailView({ applicant }: ApplicantDetailViewProps) {
  const profile = applicant.structuredProfile as StructuredProfile | undefined;

  if (!profile || Object.keys(profile).length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl">
        <p className="text-gray-500">No structured profile data available to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>
            {profile.headline && (
              <p className="text-lg font-medium text-blue-700 mt-1">{profile.headline}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              {profile.location && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {profile.location}</span>
              )}
              {profile.email && (
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {profile.email}</span>
              )}
            </div>
          </div>
          
          {profile.availability && (
            <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${profile.availability.status === 'Available' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${profile.availability.status === 'Available' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </span>
                <span className="font-semibold">{profile.availability.status}</span>
              </div>
              <span className="text-gray-500">{profile.availability.type}</span>
            </div>
          )}
        </div>

        {profile.bio && (
          <div className="mt-6 bg-white/60 p-4 rounded-xl text-gray-700 text-sm leading-relaxed">
            {profile.bio}
          </div>
        )}
      </div>

      {/* Grid Layout for Core Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Wider) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Experience */}
          {profile.experience && profile.experience.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <SectionHeader icon={<Briefcase className="w-5 h-5 text-blue-600" />} title="Work Experience" />
              <div className="space-y-6">
                {profile.experience.map((exp, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-blue-100">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5" />
                    <h4 className="font-bold text-gray-900 text-lg">{exp.role}</h4>
                    <p className="font-medium text-blue-600">{exp.company}</p>
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatDateRange(exp.startDate, exp.endDate)}
                    </p>
                    {exp.description && <p className="text-gray-700 text-sm mt-2">{exp.description}</p>}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {exp.technologies.map((tech, j) => (
                          <Badge key={j} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">{tech}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <SectionHeader icon={<Code className="w-5 h-5 text-purple-600" />} title="Projects" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.projects.map((project, i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <h4 className="font-bold text-gray-900">{project.name}</h4>
                    {project.role && <p className="text-sm font-medium text-purple-600">{project.role}</p>}
                    {project.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{project.description}</p>}
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 mt-3 hover:underline">
                        View Project <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          
          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <SectionHeader icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} title="Skills" />
              <div className="flex flex-col gap-3">
                {profile.skills.map((skill, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="font-semibold text-gray-800">{skill.name}</span>
                    {skill.level && (
                      <Badge className="bg-green-100 text-green-700 border-none hover:bg-green-200 shadow-none">
                        {skill.level}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <SectionHeader icon={<GraduationCap className="w-5 h-5 text-orange-600" />} title="Education" />
              <div className="space-y-4">
                {profile.education.map((edu, i) => (
                  <div key={i}>
                    <h4 className="font-bold text-gray-900">{edu.degree} {edu.fieldOfStudy && `in ${edu.fieldOfStudy}`}</h4>
                    <p className="text-sm text-gray-600">{edu.institution}</p>
                    {(edu.startYear || edu.endYear) && (
                      <p className="text-xs text-gray-500 mt-1">{edu.startYear} - {edu.endYear || "Present"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages & Certifications Combined Block */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            {profile.languages && profile.languages.length > 0 && (
              <div>
                <SectionHeader icon={<Globe className="w-5 h-5 text-teal-600" />} title="Languages" />
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                      {lang.name} <span className="text-gray-400 ml-1">({lang.proficiency})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.certifications && profile.certifications.length > 0 && (
              <div>
                <SectionHeader icon={<Award className="w-5 h-5 text-yellow-600" />} title="Certifications" />
                <div className="space-y-3">
                  {profile.certifications.map((cert, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm">{cert.name}</span>
                      <span className="text-xs text-gray-500">{cert.issuer} {cert.issueDate && `• ${cert.issueDate}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}