"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useGetApplicantsQuery,
  useGetDashboardSummaryQuery,
  useGetScreeningsQuery,
} from "@/redux/services/api";

// ─── Recommendation badge config ────────────────────────────
const RECOMMENDATION_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  "Strongly Recommend": {
    bg: "bg-emerald-50 border border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Strongly Recommend",
  },
  Recommend: {
    bg: "bg-blue-50 border border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "Recommend",
  },
  Consider: {
    bg: "bg-amber-50 border border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Consider",
  },
  "Do Not Recommend": {
    bg: "bg-red-50 border border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Do Not Recommend",
  },
};

// ─── Score ring component ────────────────────────────────────
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 75
      ? "#10b981"
      : score >= 50
      ? "#3b82f6"
      : score >= 30
      ? "#f59e0b"
      : "#ef4444";

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="rotate-90"
        style={{
          transform: `rotate(90deg)`,
          transformOrigin: "center",
          fontSize: size < 60 ? "10px" : "13px",
          fontWeight: 700,
          fill: color,
        }}
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Sub-score bar ────────────────────────────────────────────
function SubScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.round((value / max) * 100);
  const color =
    pct >= 75
      ? "bg-emerald-500"
      : pct >= 50
      ? "bg-blue-500"
      : pct >= 30
      ? "bg-amber-500"
      : "bg-red-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummaryQuery();
  const { data: applicants } = useGetApplicantsQuery();
  const { data: screenings } = useGetScreeningsQuery();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    title: string;
    content: {
      applicant: any;
      screeningInsight?: any; // full RankedCandidateDocument
      aiStatus?: string;
    };
  } | null>(null);

  // Pagination states
  const ITEMS_PER_PAGE = 10;
  const [shortlistPage, setShortlistPage] = useState(1);
  const [unshortlistPage, setUnshortlistPage] = useState(1);

  const latestCompleted = useMemo(
    () => screenings?.find((s) => s.status === "completed"),
    [screenings]
  );

  const shortlistedIds = useMemo(
    () =>
      new Set(
        (latestCompleted?.rankedCandidates ?? []).map((item) =>
          String(item.applicantId)
        )
      ),
    [latestCompleted]
  );

  const shortlisted = useMemo(
    () =>
      applicants?.filter((a) => shortlistedIds.has(String(a._id))) ?? [],
    [applicants, shortlistedIds]
  );

  const unshortlisted = useMemo(
    () =>
      applicants?.filter((a) => !shortlistedIds.has(String(a._id))) ?? [],
    [applicants, shortlistedIds]
  );

  const paginatedShortlisted = useMemo(
    () =>
      shortlisted.slice(
        (shortlistPage - 1) * ITEMS_PER_PAGE,
        shortlistPage * ITEMS_PER_PAGE
      ),
    [shortlisted, shortlistPage]
  );

  const paginatedUnshortlisted = useMemo(
    () =>
      unshortlisted.slice(
        (unshortlistPage - 1) * ITEMS_PER_PAGE,
        unshortlistPage * ITEMS_PER_PAGE
      ),
    [unshortlisted, unshortlistPage]
  );

  const closePreview = () => setPreviewOpen(false);

  // ── Helpers ────────────────────────────────────────────────
  const getNestedField = (applicant: any, field: string, fallbackField?: string) => {
    if (!applicant) return null;
    if (applicant[field]) return applicant[field];
    if (fallbackField && applicant[fallbackField]) return applicant[fallbackField];
    if (applicant.structuredProfile?.[field]) return applicant.structuredProfile[field];
    if (fallbackField && applicant.structuredProfile?.[fallbackField])
      return applicant.structuredProfile[fallbackField];
    if (applicant.profileData?.[field]) return applicant.profileData[field];
    if (fallbackField && applicant.profileData?.[fallbackField])
      return applicant.profileData[fallbackField];
    return null;
  };

  const formatApplicantData = (value: unknown) => {
    if (value === null || value === undefined || value === "")
      return <span className="text-gray-400 italic">Not provided</span>;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
      const extracted = value.map((item) =>
        typeof item === "object" && item?.name ? item.name : item
      );
      return extracted.length > 0 ? (
        extracted.join(", ")
      ) : (
        <span className="text-gray-400 italic">None</span>
      );
    }
    if (typeof value === "object")
      return <span className="text-gray-500 italic">Complex data</span>;
    const strValue = String(value);
    if (strValue.startsWith("http://") || strValue.startsWith("https://")) {
      return (
        <a
          href={strValue}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
        >
          {strValue}
        </a>
      );
    }
    return <span className="break-words">{strValue}</span>;
  };

  // ── Derive rank badge for shortlisted candidate card ──────
  const getRankForCandidate = (candidateId: string) => {
    const found = latestCompleted?.rankedCandidates?.find(
      (item) => String(item.applicantId) === String(candidateId)
    );
    return found?.rank ?? null;
  };

  const insight = selectedPreview?.content?.screeningInsight;
  const recConfig =
    insight?.recommendation
      ? RECOMMENDATION_CONFIG[insight.recommendation] ??
        RECOMMENDATION_CONFIG["Consider"]
      : null;

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section className="rounded-2xl bg-gradient-to-r from-primary to-blue-700 p-8 text-white shadow-md">
          <h2 className="text-3xl font-bold tracking-tight">
            Recruiter Command Center
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-white/90 leading-relaxed">
            Manage jobs, ingest applicants, and run Gemini-powered rankings
            from a single, streamlined dashboard.
          </p>
        </section>

        {/* Metrics */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Active Jobs", value: summary?.jobs ?? 0 },
            { label: "Total Applicants", value: summary?.applicants ?? 0 },
            { label: "Screening Runs", value: summary?.screenings ?? 0 },
          ].map((item) => (
            <article
              key={item.label}
              className="flex flex-col justify-center rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-sm font-medium text-gray-500">{item.label}</p>
              {isLoading ? (
                <div className="skeleton-shimmer mt-3 h-10 w-24 rounded-md bg-gray-200" />
              ) : (
                <p className="mt-2 text-4xl font-extrabold text-primary">
                  {item.value}
                </p>
              )}
            </article>
          ))}
        </section>

        {/* Latest Screening Activity */}
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-border pb-3">
            Latest Screening Activity
          </h3>
          <div className="mt-4 space-y-3">
            {(screenings ?? []).slice(0, 5).map((screening) => (
              <div
                key={screening._id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Screening #{screening._id.slice(-6)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Top {screening.topN} shortlist configuration
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    screening.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {screening.status.charAt(0).toUpperCase() +
                    screening.status.slice(1)}
                </span>
              </div>
            ))}
            {!screenings?.length && (
              <p className="text-sm text-gray-500 italic py-2">
                No screening history available.
              </p>
            )}
          </div>
        </section>

        {/* Candidates Section */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* ── Shortlisted ── */}
          <article className="rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Shortlisted Candidates
              </h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {shortlisted.length}
              </span>
            </div>
            <div className="space-y-3 flex-1">
              {paginatedShortlisted.map((candidate) => {
                const rank = getRankForCandidate(String(candidate._id));
                const candidateInsight =
                  latestCompleted?.rankedCandidates.find(
                    (item) =>
                      String(item.applicantId) === String(candidate._id)
                  ) ?? {};
                const score = (candidateInsight as any)?.matchScore;
                return (
                  <button
                    key={candidate._id}
                    type="button"
                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
                    onClick={() => {
                      setSelectedPreview({
                        title: "Shortlisted Candidate",
                        content: {
                          applicant: candidate,
                          screeningInsight: candidateInsight,
                        },
                      });
                      setPreviewOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {rank !== null && (
                        <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-sm">
                          #{rank}
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                          {candidate.fullName}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {score !== undefined
                            ? `Match score: ${score}/100 · View AI Insights`
                            : "View AI Insights"}
                        </span>
                      </div>
                    </div>
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                );
              })}
              {!shortlisted.length && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No candidates have been shortlisted yet.
                  </p>
                </div>
              )}
            </div>

            {shortlisted.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 border-t border-gray-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShortlistPage((p) => Math.max(1, p - 1))}
                  disabled={shortlistPage === 1}
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-gray-500">
                  Page {shortlistPage} of{" "}
                  {Math.ceil(shortlisted.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setShortlistPage((p) =>
                      Math.min(
                        Math.ceil(shortlisted.length / ITEMS_PER_PAGE),
                        p + 1
                      )
                    )
                  }
                  disabled={
                    shortlistPage >=
                    Math.ceil(shortlisted.length / ITEMS_PER_PAGE)
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </article>

          {/* ── Unshortlisted ── */}
          <article className="rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Unshortlisted Candidates
              </h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {unshortlisted.length}
              </span>
            </div>
            <div className="space-y-3 flex-1">
              {paginatedUnshortlisted.map((candidate) => (
                <button
                  key={candidate._id}
                  type="button"
                  className="group flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-gray-400 hover:shadow-md"
                  onClick={() => {
                    setSelectedPreview({
                      title: "Unshortlisted Candidate",
                      content: {
                        applicant: candidate,
                        aiStatus:
                          "Did not meet the threshold for the latest shortlist.",
                      },
                    });
                    setPreviewOpen(true);
                  }}
                >
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">
                      {candidate.fullName}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      View Profile
                    </span>
                  </div>
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
              {!unshortlisted.length && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    All available candidates are currently shortlisted.
                  </p>
                </div>
              )}
            </div>

            {unshortlisted.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 border-t border-gray-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setUnshortlistPage((p) => Math.max(1, p - 1))
                  }
                  disabled={unshortlistPage === 1}
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-gray-500">
                  Page {unshortlistPage} of{" "}
                  {Math.ceil(unshortlisted.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setUnshortlistPage((p) =>
                      Math.min(
                        Math.ceil(unshortlisted.length / ITEMS_PER_PAGE),
                        p + 1
                      )
                    )
                  }
                  disabled={
                    unshortlistPage >=
                    Math.ceil(unshortlisted.length / ITEMS_PER_PAGE)
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </article>
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════
          Slide-Over Drawer
      ════════════════════════════════════════════════════════ */}
      {previewOpen && selectedPreview && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closePreview}
            aria-hidden="true"
          />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  {selectedPreview.title}
                </p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedPreview.content.applicant?.fullName ||
                    "Candidate Profile"}
                </h3>
                {/* Rank + recommendation pill in header */}
                {insight?.rank && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      Rank #{insight.rank}
                    </span>
                    {recConfig && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${recConfig.bg} ${recConfig.text}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${recConfig.dot}`}
                        />
                        {recConfig.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                className="h-10 w-10 rounded-full p-0 hover:bg-gray-200 flex-shrink-0"
                onClick={closePreview}
              >
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {/* Drawer Body */}
            <div className="relative flex-1 overflow-y-auto px-6 py-6 space-y-8">

              {/* ── AI INSIGHTS BLOCK (only for shortlisted with real data) ── */}
              {insight && Object.keys(insight).length > 0 && (
                <section>
                  {/* Section title */}
                  <div className="flex items-center gap-2 mb-4">
                    <svg
                      className="h-5 w-5 text-primary flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.467 4.533l-1.8-1.8L16 4.4l1.667 1.667L16 7.733l1.667 1.667 1.8-1.8 1.8 1.8 1.666-1.667-1.666-1.667 1.666-1.667zM8.533 2.667L6.4 7.333 1.733 9.467l4.667 2.133L8.533 16.267l2.134-4.667 4.666-2.133-4.666-2.134z" />
                    </svg>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                      Gemini AI Screening Analysis
                    </h4>
                  </div>

                  {/* Overall match score + sub-scores */}
                  {insight.matchScore !== undefined && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-4">
                      <div className="flex items-center gap-5">
                        {/* Big score ring */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          <ScoreRing score={insight.matchScore} size={72} />
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            Match
                          </span>
                        </div>
                        {/* Sub-score bars */}
                        <div className="flex-1 space-y-2.5 min-w-0">
                          {insight.skillsScore !== undefined && (
                            <SubScoreBar
                              label="Skills"
                              value={insight.skillsScore}
                              max={40}
                            />
                          )}
                          {insight.experienceScore !== undefined && (
                            <SubScoreBar
                              label="Experience"
                              value={insight.experienceScore}
                              max={30}
                            />
                          )}
                          {insight.educationScore !== undefined && (
                            <SubScoreBar
                              label="Education"
                              value={insight.educationScore}
                              max={15}
                            />
                          )}
                          {insight.completenessScore !== undefined && (
                            <SubScoreBar
                              label="Profile Completeness"
                              value={insight.completenessScore}
                              max={15}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Experience years */}
                  {insight.calculatedExperienceYears !== undefined && (
                    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                      <svg className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-blue-700 font-medium">
                        Calculated experience:{" "}
                        <strong>{insight.calculatedExperienceYears} year{insight.calculatedExperienceYears !== 1 ? "s" : ""}</strong>
                      </span>
                    </div>
                  )}

                  {/* Matched skills */}
                  {Array.isArray(insight.matchedSkills) && insight.matchedSkills.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Matched Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {insight.matchedSkills.map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          >
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing skills */}
                  {Array.isArray(insight.missingSkills) && insight.missingSkills.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Missing Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {insight.missingSkills.map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600"
                          >
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {insight.explanation && (
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        AI Explanation
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {insight.explanation}
                      </p>
                    </div>
                  )}

                  {/* Strengths */}
                  {Array.isArray(insight.strengths) && insight.strengths.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Strengths
                      </p>
                      <ul className="space-y-2">
                        {insight.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Gaps & Risks */}
                  {Array.isArray(insight.gapsAndRisks) && insight.gapsAndRisks.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Gaps &amp; Risks
                      </p>
                      <ul className="space-y-2">
                        {insight.gapsAndRisks.map((g: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Scored-by badge */}
                  {insight.scoredBy && (
                    <div className="mt-2 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {insight.scoredBy}
                      </span>
                    </div>
                  )}
                </section>
              )}

              {/* ── Status notice for unshortlisted ── */}
              {selectedPreview.content.aiStatus && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">
                    {selectedPreview.content.aiStatus}
                  </p>
                </div>
              )}

              {/* ── Applicant Information ── */}
              <section>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">
                  Applicant Information
                </h4>
                <dl className="space-y-4 text-sm">
                  {[
                    { label: "Email Address", value: getNestedField(selectedPreview.content.applicant, "email") },
                    { label: "Phone Number", value: getNestedField(selectedPreview.content.applicant, "phone", "phoneNumber") },
                    { label: "Location", value: getNestedField(selectedPreview.content.applicant, "location", "address") },
                    { label: "Skills", value: getNestedField(selectedPreview.content.applicant, "skills") },
                    { label: "Summary", value: getNestedField(selectedPreview.content.applicant, "summary", "headline") },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-3 gap-4">
                      <dt className="font-medium text-gray-500">{label}</dt>
                      <dd className="col-span-2 text-gray-900">{formatApplicantData(value)}</dd>
                    </div>
                  ))}

                  {/* Dynamic remaining fields */}
                  {Object.entries(selectedPreview.content.applicant || {}).map(
                    ([key, value]) => {
                      if (
                        [
                          "_id", "id", "fullName", "email", "phone",
                          "location", "__v", "createdAt", "updatedAt",
                          "structuredProfile", "profileData", "skills", "summary",
                        ].includes(key)
                      )
                        return null;
                      return (
                        <div
                          className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-2"
                          key={key}
                        >
                          <dt className="font-medium text-gray-500 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </dt>
                          <dd className="col-span-2 text-gray-900">
                            {formatApplicantData(value)}
                          </dd>
                        </div>
                      );
                    }
                  )}
                </dl>
              </section>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-gray-100 bg-gray-50 p-6">
              <div className="flex gap-3">
                <Button variant="outline" className="w-full" onClick={closePreview}>
                  Close
                </Button>
                <Button className="w-full bg-primary text-white hover:bg-primary/90">
                  View Full Profile
                </Button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}