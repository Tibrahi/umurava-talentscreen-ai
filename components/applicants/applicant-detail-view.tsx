"use client";

import React from "react";
import type { Applicant, StructuredProfile, Skill } from "@/lib/types";
import {
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
  ExternalLink,
  Link,
  Layers,
  Languages,
  Clock,
  CheckCircle2,
  Star,
  Zap,
  Database,
  Tag,
  FolderOpen,
  Building2,
  User,
  Cpu,
  BookOpen,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Brand icons not available in this version of lucide-react
// ---------------------------------------------------------------------------
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dig through the profileData nesting chain to find the richest raw
// so existing corrupted Atlas documents still display correctly.
// ---------------------------------------------------------------------------
function getDeepestRaw(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  const pd = obj.profileData;
  if (pd && typeof pd === "object" && !Array.isArray(pd)) {
    const inner = (pd as Record<string, unknown>).raw;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return getDeepestRaw(inner) ?? (inner as Record<string, unknown>);
    }
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Pick the richest structuredProfile available across all nesting levels.
// A "rich" profile has skills with real level data or experience entries.
// ---------------------------------------------------------------------------
function resolveRichProfile(applicant: Applicant): StructuredProfile {
  // Collect all candidate profiles from every nesting level
  const candidates: StructuredProfile[] = [];

  function collect(data: unknown) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    const obj = data as Record<string, unknown>;
    if (obj.structuredProfile && typeof obj.structuredProfile === "object") {
      candidates.push(obj.structuredProfile as StructuredProfile);
    }
    const pd = obj.profileData;
    if (pd && typeof pd === "object" && !Array.isArray(pd)) {
      const raw = (pd as Record<string, unknown>).raw;
      if (raw) collect(raw);
    }
  }

  collect(applicant);

  // Score each: prefer whichever has the most data
  function score(p: StructuredProfile): number {
    let s = 0;
    s += (p.experience?.length ?? 0) * 10;
    s += (p.certifications?.length ?? 0) * 8;
    s += (p.projects?.length ?? 0) * 7;
    s += (p.languages?.length ?? 0) * 5;
    s += (p.skills?.length ?? 0) * 3;
    // Prefer profiles where skills have real level data (not just default)
    const richSkills = p.skills?.filter(
      (sk) => sk.yearsOfExperience && sk.yearsOfExperience > 1
    ).length ?? 0;
    s += richSkills * 4;
    s += p.bio ? 2 : 0;
    s += p.location ? 1 : 0;
    s += (p.socialLinks?.linkedin || p.socialLinks?.github) ? 3 : 0;
    return s;
  }

  const best = candidates.sort((a, b) => score(b) - score(a))[0];
  if (!best) {
    // Fallback: build a minimal profile from top-level applicant fields
    const nameParts = applicant.fullName?.split(" ") || ["Unknown"];
    return {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: applicant.email || "",
      headline: applicant.summary || "",
      skills: applicant.skills?.map((s) => ({ name: s })) || [],
      experience: [],
      education: [],
      languages: [],
      certifications: [],
      projects: [],
    };
  }

  // Enrich: if best has skills but no level data, try to find richer skills
  if (best.skills && best.skills.every((sk) => !sk.yearsOfExperience || sk.yearsOfExperience <= 1)) {
    for (const candidate of candidates) {
      if (candidate !== best) {
        const hasRich = candidate.skills?.some(
          (sk) => sk.yearsOfExperience && sk.yearsOfExperience > 1
        );
        if (hasRich && candidate.skills && candidate.skills.length > 0) {
          best.skills = candidate.skills;
          break;
        }
      }
    }
  }

  // Also pull socialLinks, location, bio if missing
  for (const candidate of candidates) {
    if (candidate !== best) {
      if (!best.location && candidate.location) best.location = candidate.location;
      if (!best.bio && candidate.bio) best.bio = candidate.bio;
      if (
        (!best.socialLinks?.linkedin && !best.socialLinks?.github) &&
        (candidate.socialLinks?.linkedin || candidate.socialLinks?.github)
      ) {
        best.socialLinks = candidate.socialLinks;
      }
      if (!best.languages?.length && candidate.languages?.length) {
        best.languages = candidate.languages;
      }
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  if (dateStr.toLowerCase() === "present") return "Present";
  const d = new Date(`${dateStr}-01`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function formatDateRange(startDate?: string, endDate?: string): string {
  const s = formatDate(startDate);
  const e = formatDate(endDate);
  if (!s) return "Timeline not specified";
  if (!e || endDate === "Present") return `${s} — Present`;
  return `${s} — ${e}`;
}

function formatTimestamp(ts?: string | { $date: string }): string {
  if (!ts) return "";
  const raw = typeof ts === "object" && "$date" in ts ? ts.$date : ts;
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLevelColor(level?: string): string {
  switch (level) {
    case "Expert": return "bg-violet-100 text-violet-800 border-violet-200";
    case "Advanced": return "bg-green-100 text-green-800 border-green-200";
    case "Intermediate": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Beginner": return "bg-gray-100 text-gray-600 border-gray-200";
    default: return "bg-gray-50 text-gray-500 border-gray-100";
  }
}

function getLevelBar(level?: string): number {
  switch (level) {
    case "Expert": return 100;
    case "Advanced": return 75;
    case "Intermediate": return 50;
    case "Beginner": return 25;
    default: return 40;
  }
}

function getProficiencyColor(proficiency?: string): string {
  switch (proficiency) {
    case "Native": return "bg-green-100 text-green-800";
    case "Fluent": return "bg-blue-100 text-blue-800";
    case "Conversational": return "bg-yellow-100 text-yellow-800";
    case "Basic": return "bg-gray-100 text-gray-600";
    default: return "bg-gray-100 text-gray-500";
  }
}

function getAvailabilityColor(status?: string): string {
  switch (status) {
    case "Available": return "bg-green-100 text-green-800 border-green-200";
    case "Open to Opportunities": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Not Available": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function getSourceColor(source?: string): string {
  switch (source) {
    case "excel": return "bg-emerald-100 text-emerald-800";
    case "csv": return "bg-purple-100 text-purple-800";
    case "json": return "bg-blue-100 text-blue-800";
    case "pdf": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-600";
  }
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({
  icon,
  title,
  children,
  accent = "green",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: "green" | "blue" | "violet" | "orange" | "gray";
}) {
  const accentMap = {
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    orange: "bg-orange-50 text-orange-600",
    gray: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
        <div className={`p-2 rounded-xl ${accentMap[accent]}`}>{icon}</div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface ApplicantDetailViewProps {
  applicant: Applicant;
  onClose?: () => void;
}

export function ApplicantDetailView({
  applicant,
  onClose,
}: ApplicantDetailViewProps) {
  const profile = resolveRichProfile(applicant);

  const safeProfile: StructuredProfile = {
    ...profile,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    certifications: Array.isArray(profile.certifications)
      ? profile.certifications
      : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
  };

  const displayName =
    [safeProfile.firstName, safeProfile.lastName].filter(Boolean).join(" ") ||
    applicant.fullName ||
    "Unknown Candidate";

  const displayEmail =
    safeProfile.email && !safeProfile.email.endsWith("@unknown.local")
      ? safeProfile.email
      : applicant.email && !applicant.email.endsWith("@unknown.local")
      ? applicant.email
      : null;

  const hasSocial =
    safeProfile.socialLinks?.linkedin ||
    safeProfile.socialLinks?.github ||
    safeProfile.socialLinks?.portfolio;

  const createdAt = formatTimestamp(
    (applicant as unknown as Record<string, unknown>).createdAt as string
  );
  const updatedAt = formatTimestamp(
    (applicant as unknown as Record<string, unknown>).updatedAt as string
  );

  return (
    <div className="w-full bg-white">
      {/* ── Close button (only when used standalone, not inside modal) ── */}
      {onClose && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-black text-white rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden">
        {/* Decorative bg */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-green-400" />
          <div className="absolute -bottom-16 -left-10 w-80 h-80 rounded-full bg-white" />
        </div>

        <div className="relative">
          {/* Name + availability */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {displayName}
              </h1>
              {safeProfile.headline && (
                <p className="text-green-400 font-semibold text-base sm:text-lg mt-1">
                  {safeProfile.headline}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {safeProfile.availability?.status && (
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${getAvailabilityColor(
                    safeProfile.availability.status
                  )}`}
                >
                  {safeProfile.availability.status}
                </span>
              )}
              {applicant.source && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${getSourceColor(
                    applicant.source
                  )}`}
                >
                  {applicant.source}
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {safeProfile.bio && safeProfile.bio !== safeProfile.headline && (
            <p className="text-gray-300 leading-relaxed mb-5 max-w-3xl text-sm sm:text-base">
              {safeProfile.bio}
            </p>
          )}

          {/* Contact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/10">
            {displayEmail && (
              <a
                href={`mailto:${displayEmail}`}
                className="flex items-center gap-2.5 text-gray-200 hover:text-white transition group"
              >
                <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-green-500/20">
                  <Mail className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-medium truncate">
                  {displayEmail}
                </span>
              </a>
            )}
            {applicant.phone && (
              <div className="flex items-center gap-2.5 text-gray-200">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-medium">{applicant.phone}</span>
              </div>
            )}
            {safeProfile.location && (
              <div className="flex items-center gap-2.5 text-gray-200">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-medium">
                  {safeProfile.location}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-gray-200">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Briefcase className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm font-medium">
                {applicant.yearsOfExperience ?? 0} years of experience
              </span>
            </div>
            {safeProfile.availability?.type && (
              <div className="flex items-center gap-2.5 text-gray-200">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-medium">
                  {safeProfile.availability.type}
                  {safeProfile.availability.startDate && (
                    <span className="text-gray-400 ml-1">
                      · from{" "}
                      {new Date(
                        safeProfile.availability.startDate
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Social links */}
          {hasSocial && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
              {safeProfile.socialLinks?.linkedin && (
                <a
                  href={safeProfile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-blue-600/30 rounded-lg text-sm font-medium text-gray-200 hover:text-white transition"
                >
                  <LinkedinIcon className="w-4 h-4" />
                  LinkedIn
                </a>
              )}
              {safeProfile.socialLinks?.github && (
                <a
                  href={safeProfile.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-gray-600/40 rounded-lg text-sm font-medium text-gray-200 hover:text-white transition"
                >
                  <GithubIcon className="w-4 h-4" />
                  GitHub
                </a>
              )}
              {safeProfile.socialLinks?.portfolio && (
                <a
                  href={safeProfile.socialLinks.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-green-600/30 rounded-lg text-sm font-medium text-gray-200 hover:text-white transition"
                >
                  <Globe className="w-4 h-4" />
                  Portfolio
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Experience",
            value: `${applicant.yearsOfExperience ?? 0}y`,
            sub: "Total years",
            icon: <Briefcase className="w-5 h-5" />,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Skills",
            value: safeProfile.skills?.length ?? 0,
            sub: "Technologies",
            icon: <Code className="w-5 h-5" />,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Projects",
            value: safeProfile.projects?.length ?? 0,
            sub: "Portfolio items",
            icon: <FolderOpen className="w-5 h-5" />,
            color: "text-violet-600 bg-violet-50",
          },
          {
            label: "Roles",
            value: safeProfile.experience?.length ?? 0,
            sub: "Past positions",
            icon: <Building2 className="w-5 h-5" />,
            color: "text-orange-600 bg-orange-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-1 shadow-sm"
          >
            <div className={`${stat.color} p-2 rounded-lg w-fit`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">
              {stat.value}
            </p>
            <p className="text-xs font-semibold text-gray-700">{stat.label}</p>
            <p className="text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── GRID: Skills + Languages ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Skills – takes 2 cols */}
        {safeProfile.skills && safeProfile.skills.length > 0 && (
          <div className="lg:col-span-2">
            <Section
              icon={<Code className="w-5 h-5" />}
              title="Technical Skills"
              accent="green"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {safeProfile.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-gray-50 rounded-xl p-3.5 border border-gray-100 hover:border-green-200 hover:bg-green-50/40 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {skill.name}
                        </span>
                      </div>
                      {skill.level && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${getLevelColor(
                            skill.level
                          )}`}
                        >
                          {skill.level}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
                        style={{ width: `${getLevelBar(skill.level)}%` }}
                      />
                    </div>
                    {skill.yearsOfExperience && skill.yearsOfExperience > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        {skill.yearsOfExperience} yr{skill.yearsOfExperience !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Languages – 1 col */}
        {safeProfile.languages && safeProfile.languages.length > 0 && (
          <div className="lg:col-span-1">
            <Section
              icon={<Languages className="w-5 h-5" />}
              title="Languages"
              accent="blue"
            >
              <div className="space-y-3">
                {safeProfile.languages.map((lang, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-sm text-gray-900">
                        {lang.name}
                      </span>
                    </div>
                    {lang.proficiency && (
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${getProficiencyColor(
                          lang.proficiency
                        )}`}
                      >
                        {lang.proficiency}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>

      {/* ── EXPERIENCE ────────────────────────────────────────────────────── */}
      {safeProfile.experience && safeProfile.experience.length > 0 && (
        <div className="mb-6">
          <Section
            icon={<Briefcase className="w-5 h-5" />}
            title="Professional Experience"
            accent="green"
          >
            <div className="space-y-6">
              {safeProfile.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="relative pl-6 border-l-2 border-green-100 pb-2 last:pb-0"
                >
                  <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[7px] top-1.5 border-2 border-white shadow-sm" />
                  {exp.isCurrent && (
                    <div className="absolute w-2 h-2 bg-green-400 rounded-full -left-[6px] top-2 animate-ping opacity-50" />
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                      {exp.role}
                    </h3>
                    {exp.isCurrent && (
                      <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-green-700 font-semibold text-sm">
                      {exp.company}
                    </span>
                    <span className="text-gray-300">·</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      <Calendar className="w-3 h-3" />
                      {formatDateRange(exp.startDate, exp.endDate)}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                      {exp.description}
                    </p>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {exp.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs bg-black text-white px-2.5 py-1 rounded-full font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── EDUCATION ─────────────────────────────────────────────────────── */}
      {safeProfile.education && safeProfile.education.length > 0 && (
        <div className="mb-6">
          <Section
            icon={<GraduationCap className="w-5 h-5" />}
            title="Education"
            accent="blue"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safeProfile.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">
                        {edu.degree}
                      </h3>
                      <p className="text-blue-700 font-semibold text-sm mt-0.5">
                        {edu.institution}
                      </p>
                    </div>
                  </div>
                  {edu.fieldOfStudy && (
                    <p className="text-xs text-gray-500 mb-2 ml-11">
                      <span className="font-medium text-gray-700">
                        Field:
                      </span>{" "}
                      {edu.fieldOfStudy}
                    </p>
                  )}
                  {(edu.startYear || edu.endYear) && (
                    <div className="flex items-center gap-1.5 ml-11 mt-2 pt-2 border-t border-blue-100">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">
                        {edu.startYear ?? "N/A"} — {edu.endYear ?? "Present"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── CERTIFICATIONS ────────────────────────────────────────────────── */}
      {safeProfile.certifications && safeProfile.certifications.length > 0 && (
        <div className="mb-6">
          <Section
            icon={<Award className="w-5 h-5" />}
            title="Certifications"
            accent="orange"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {safeProfile.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-orange-50/60 rounded-xl border border-orange-100 hover:border-orange-200 transition-colors"
                >
                  <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <Star className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm">
                      {cert.name}
                    </h3>
                    {cert.issuer && (
                      <p className="text-orange-700 text-xs font-semibold mt-0.5">
                        {cert.issuer}
                      </p>
                    )}
                    {cert.issueDate && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(cert.issueDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── PROJECTS ──────────────────────────────────────────────────────── */}
      {safeProfile.projects && safeProfile.projects.length > 0 && (
        <div className="mb-6">
          <Section
            icon={<FolderOpen className="w-5 h-5" />}
            title="Projects"
            accent="violet"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safeProfile.projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-violet-50/40 rounded-xl border border-violet-100 hover:border-violet-200 transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug">
                      {proj.name}
                    </h3>
                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-violet-100 hover:bg-violet-200 rounded-lg transition-colors flex-shrink-0"
                        title="View project"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-violet-600" />
                      </a>
                    )}
                  </div>
                  {proj.role && (
                    <p className="text-violet-700 font-semibold text-xs mb-1.5">
                      {proj.role}
                    </p>
                  )}
                  {proj.description && (
                    <p className="text-gray-600 text-xs leading-relaxed mb-3">
                      {proj.description}
                    </p>
                  )}
                  {(proj.startDate || proj.endDate) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                      <Calendar className="w-3 h-3" />
                      {formatDateRange(proj.startDate, proj.endDate)}
                    </div>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                      {proj.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── METADATA FOOTER ───────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600">
            Record Details
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Record ID",
              value: applicant._id,
              mono: true,
              truncate: true,
            },
            {
              label: "Data Source",
              value: applicant.source?.toUpperCase() ?? "—",
              mono: false,
              truncate: false,
            },
            {
              label: "Created",
              value: createdAt || "—",
              mono: false,
              truncate: false,
            },
            {
              label: "Last Updated",
              value: updatedAt || "—",
              mono: false,
              truncate: false,
            },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {item.label}
              </p>
              <p
                className={`text-sm text-gray-700 font-medium ${
                  item.mono ? "font-mono text-xs break-all" : ""
                } ${item.truncate ? "truncate" : ""}`}
                title={item.truncate ? String(item.value) : undefined}
              >
                {item.value || "—"}
              </p>
            </div>
          ))}
        </div>
        {/* Duplicate status */}
        {applicant.isDuplicate && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
            <span className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2 py-1 rounded-lg">
              ⚠ Marked as duplicate
            </span>
            {applicant.duplicateOf && (
              <span className="text-xs text-gray-400 font-mono">
                of {String(applicant.duplicateOf)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}