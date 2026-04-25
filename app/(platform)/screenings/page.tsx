"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { getErrorMessage } from "@/lib/utils";
import { ApplicantDetailModal } from "@/components/applicants/applicant-detail-modal";
import {
  useGetApplicantsQuery,
  useGetJobsQuery,
  useGetScreeningsQuery,
  useRunScreeningMutation,
} from "@/redux/services/api";
import type { Applicant } from "@/lib/types";
import {
  Zap,
  Trophy,
  ChevronRight,
  Star,
  AlertTriangle,
  CheckCircle,
  User,
  Briefcase,
  Target,
  TrendingUp,
  X,
  Clock,
  MapPin,
  GraduationCap,
} from "lucide-react";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" }
    : score >= 65 ? { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" }
    : score >= 45 ? { bg: "#fef3c7", text: "#92400e", border: "#fde68a" }
    : { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };

  return (
    <div
      style={{
        minWidth: "52px",
        height: "52px",
        borderRadius: "12px",
        background: color.bg,
        border: `1.5px solid ${color.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "16px", fontWeight: 800, color: color.text, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: "9px", color: color.text, opacity: 0.7, lineHeight: 1, marginTop: "1px" }}>/100</span>
    </div>
  );
}

function RecommendationBadge({ rec }: { rec: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    "Strongly Recommend": { bg: "#d1fae5", text: "#065f46" },
    Recommend: { bg: "#dbeafe", text: "#1e40af" },
    Consider: { bg: "#fef3c7", text: "#92400e" },
    "Do Not Recommend": { bg: "#fee2e2", text: "#991b1b" },
  };
  const s = map[rec] || { bg: "#f3f4f6", text: "#374151" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {rec}
    </span>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function resolveApplicantMeta(applicant: Applicant) {
  const sp = (applicant.structuredProfile || {}) as Record<string, unknown>;
  const pd = (applicant.profileData || {}) as Record<string, unknown>;
  const raw = (pd.raw || {}) as Record<string, unknown>;

  function safeParse<T>(val: unknown): T[] {
    if (Array.isArray(val)) return val as T[];
    if (typeof val === "string") { try { return JSON.parse(val) as T[]; } catch { return []; } }
    return [];
  }
  function safeObj<T>(val: unknown): T | undefined {
    if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
    if (typeof val === "string") { try { return JSON.parse(val) as T; } catch { return undefined; } }
    return undefined;
  }

  const location = (sp.location || raw["Location"] || "") as string;
  const headline = (sp.headline || raw["Headline"] || applicant.summary || "") as string;
  const expEntries: { startDate?: string; endDate?: string; role?: string; company?: string }[] =
    safeParse(sp.experience || raw["experience"]);
  const eduEntries: { degree?: string; institution?: string }[] =
    safeParse(sp.education || raw["education"]);
  const skills: { name?: string }[] =
    safeParse(sp.skills || raw["skills"] || applicant.skills?.map((s) => ({ name: s })));
  const availability = safeObj<{ status?: string; type?: string }>(sp.availability || raw["availability"]);

  let calcExp = applicant.yearsOfExperience || 0;
  if (calcExp === 0 && expEntries.length > 0) {
    const total = expEntries.reduce((acc, exp) => {
      const start = new Date(((exp.startDate || "") + "-01").slice(0, 10));
      const end = !exp.endDate || exp.endDate === "Present" ? new Date() : new Date((exp.endDate + "-01").slice(0, 10));
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
      return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    }, 0);
    calcExp = Math.round(total);
  }

  const currentJob = expEntries.find((e) => e.endDate === "Present" || !e.endDate);

  return { location, headline, skills, eduEntries, availability, calcExp, currentJob };
}

export default function ScreeningsPage() {
  const { data: jobs } = useGetJobsQuery();
  const { data: applicants } = useGetApplicantsQuery();
  const { data: screenings, error: screeningsError } = useGetScreeningsQuery(undefined, {
    pollingInterval: 6000,
  });
  const [runScreening, { isLoading: isRunning }] = useRunScreeningMutation();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [topNByJob, setTopNByJob] = useState<Record<string, 10 | 20>>({});
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [profileModalApplicant, setProfileModalApplicant] = useState<Applicant | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const latestCompleted = useMemo(
    () => screenings?.find((item) => item.status === "completed"),
    [screenings]
  );

  const selectedTopN = selectedJobId ? topNByJob[selectedJobId] ?? 10 : 10;

  const selectedCandidate = useMemo(() => {
    if (!selectedCandidateId || !latestCompleted) return null;
    return latestCompleted.rankedCandidates?.find(
      (c) => String(c.applicantId) === String(selectedCandidateId)
    ) ?? null;
  }, [selectedCandidateId, latestCompleted]);

  const selectedApplicant = useMemo(() => {
    if (!selectedCandidateId) return null;
    return applicants?.find((a) => String(a._id) === String(selectedCandidateId)) ?? null;
  }, [selectedCandidateId, applicants]);

  const handleRunScreening = async (jobId: string) => {
    if (!jobId) return;
    const target = topNByJob[jobId] ?? 10;
    try {
      setStatus({ type: "info", text: `Analyzing all candidates for top ${target}…` });
      const response = await runScreening({ jobId, topN: target }).unwrap();
      setStatus({
        type: "success",
        text: (response as { message?: string })?.message || "Screening complete. Results below.",
      });
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Screening failed. Check Gemini key.") });
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Status toast */}
      {status && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: status.type === "success" ? "#d1fae5" : status.type === "error" ? "#fee2e2" : "#dbeafe",
            color: status.type === "success" ? "#065f46" : status.type === "error" ? "#991b1b" : "#1e40af",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}
        >
          <CheckCircle style={{ width: "16px", height: "16px" }} />
          {status.text}
        </div>
      )}

      {screeningsError && (
        <ActionMessage type="error" message="Could not load screenings. Verify MongoDB settings." />
      )}

      {/* ── Trigger Panel ─────────────────────────────────── */}
      <section
        style={{
          background: "white",
          borderRadius: "20px",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(16,185,129,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap style={{ width: "18px", height: "18px", color: "#6ee7b7" }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "white" }}>AI Screening</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              Gemini evaluates all applicants at once against the selected job
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Quick trigger */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              padding: "16px",
              background: "#fafafa",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              marginBottom: "16px",
            }}
          >
            <select
              style={{
                flex: "1 1 200px",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1.5px solid #e5e7eb",
                fontSize: "13px",
                color: "#374151",
                background: "white",
                outline: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="">Select a job to screen against…</option>
              {(jobs ?? []).map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                selectedJobId &&
                setTopNByJob((prev) => ({
                  ...prev,
                  [selectedJobId]: prev[selectedJobId] === 20 ? 10 : 20,
                }))
              }
              disabled={!selectedJobId}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: "1.5px solid #e5e7eb",
                background: "white",
                fontWeight: 600,
                fontSize: "13px",
                cursor: selectedJobId ? "pointer" : "not-allowed",
                color: "#374151",
                opacity: selectedJobId ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "inherit",
              }}
            >
              <Target style={{ width: "14px", height: "14px" }} />
              Top {selectedTopN}
            </button>

            <button
              disabled={!selectedJobId || isRunning}
              onClick={() => handleRunScreening(selectedJobId)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background:
                  !selectedJobId || isRunning
                    ? "#e5e7eb"
                    : "linear-gradient(135deg, #059669, #047857)",
                color: !selectedJobId || isRunning ? "#9ca3af" : "white",
                fontWeight: 700,
                fontSize: "14px",
                cursor: !selectedJobId || isRunning ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                fontFamily: "inherit",
              }}
            >
              <Zap style={{ width: "15px", height: "15px" }} />
              {isRunning ? "Analyzing…" : "Run Screening"}
            </button>

            {!jobs?.length && (
              <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                Create a job first to enable screening.
              </p>
            )}
          </div>

          {/* Per-job trigger cards */}
          {jobs && jobs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
              {(jobs ?? []).map((job) => (
                <div
                  key={job._id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: 700, color: "#111827" }}>{job.title}</h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#6b7280",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {job.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() =>
                        setTopNByJob((prev) => ({ ...prev, [job._id]: prev[job._id] === 20 ? 10 : 20 }))
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#374151",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Top {topNByJob[job._id] ?? 10}
                    </button>
                    <button
                      disabled={isRunning}
                      onClick={() => handleRunScreening(job._id)}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: isRunning ? "#e5e7eb" : "#059669",
                        color: isRunning ? "#9ca3af" : "white",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: isRunning ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        fontFamily: "inherit",
                      }}
                    >
                      <Zap style={{ width: "12px", height: "12px" }} />
                      Screen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Loading skeletons */}
      {isRunning && (
        <section
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <TrendingUp style={{ width: "18px", height: "18px", color: "#059669" }} />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              Gemini is analyzing all candidates…
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: "90px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {latestCompleted && latestCompleted.rankedCandidates && latestCompleted.rankedCandidates.length > 0 && (
        <section
          style={{
            background: "white",
            borderRadius: "20px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Trophy style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                Screening Results
              </h3>
              <span
                style={{
                  background: "#f0fdf4",
                  color: "#065f46",
                  borderRadius: "999px",
                  padding: "2px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid #d1fae5",
                }}
              >
                {latestCompleted.rankedCandidates.length} candidates ranked
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0" }}>
            {latestCompleted.rankedCandidates.map((candidate, index) => {
              const applicant = applicants?.find(
                (a) => String(a._id) === String(candidate.applicantId)
              );
              const meta = applicant ? resolveApplicantMeta(applicant) : null;
              const isSelected = selectedCandidateId === String(candidate.applicantId);

              return (
                <div
                  key={`${candidate.applicantId}-${index}`}
                  onClick={() => {
                    setSelectedCandidateId(String(candidate.applicantId));
                    setPanelOpen(true);
                  }}
                  style={{
                    padding: "16px 24px",
                    borderBottom: index < latestCompleted.rankedCandidates.length - 1 ? "1px solid #f3f4f6" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    background: isSelected ? "#f0fdf4" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        index === 0 ? "#fef3c7" : index === 1 ? "#f3f4f6" : index === 2 ? "#fff7ed" : "#f9fafb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "13px",
                      color:
                        index === 0 ? "#92400e" : index === 1 ? "#374151" : index === 2 ? "#c2410c" : "#6b7280",
                      flexShrink: 0,
                    }}
                  >
                    {candidate.rank || index + 1}
                  </div>

                  {/* Avatar */}
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #0f172a, #1e293b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#6ee7b7",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(applicant?.fullName || "?")}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                        {applicant?.fullName || "Unknown Candidate"}
                      </span>
                      <RecommendationBadge rec={candidate.recommendation} />
                    </div>
                    {meta?.headline && (
                      <p
                        style={{
                          margin: "0 0 3px",
                          fontSize: "12px",
                          color: "#6b7280",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "300px",
                        }}
                      >
                        {meta.headline}
                      </p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {meta?.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#9ca3af" }}>
                          <MapPin style={{ width: "10px", height: "10px" }} />
                          {meta.location}
                        </span>
                      )}
                      {meta && meta.calcExp > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#9ca3af" }}>
                          <Clock style={{ width: "10px", height: "10px" }} />
                          {meta.calcExp}y exp
                        </span>
                      )}
                      {meta?.eduEntries && meta.eduEntries.length > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#9ca3af" }}>
                          <GraduationCap style={{ width: "10px", height: "10px" }} />
                          {meta.eduEntries[0].degree}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score + arrow */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <ScoreBadge score={candidate.matchScore} />
                    <ChevronRight style={{ width: "16px", height: "16px", color: "#d1d5db" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Side Panel ───────────────────────────────────────── */}
      {panelOpen && selectedCandidate && selectedApplicant && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 40,
            }}
            onClick={() => setPanelOpen(false)}
          />
          {/* Panel */}
          <div
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "min(480px, 95vw)",
              background: "white",
              boxShadow: "-4px 0 30px rgba(0,0,0,0.15)",
              zIndex: 50,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: 700, color: "white" }}>
                  AI Evaluation Report
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                  #{selectedCandidate.rank || "–"} · {selectedApplicant.fullName}
                </p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background: "rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <X style={{ width: "15px", height: "15px" }} />
              </button>
            </div>

            {/* Panel body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Score + recommendation */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  padding: "16px",
                  background: "#fafafa",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <ScoreBadge score={selectedCandidate.matchScore} />
                <div>
                  <RecommendationBadge rec={selectedCandidate.recommendation} />
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                    Match score from Gemini AI evaluation
                  </p>
                </div>
              </div>

              {/* Applicant quick info */}
              <div
                style={{
                  padding: "14px 16px",
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                {(() => {
                  const meta = resolveApplicantMeta(selectedApplicant);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #0f172a, #1e293b)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#6ee7b7",
                          }}
                        >
                          {getInitials(selectedApplicant.fullName || "?")}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                            {selectedApplicant.fullName}
                          </p>
                          {meta.headline && (
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{meta.headline}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                        {meta.location && (
                          <span style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "3px" }}>
                            <MapPin style={{ width: "11px", height: "11px" }} /> {meta.location}
                          </span>
                        )}
                        {meta.calcExp > 0 && (
                          <span style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Clock style={{ width: "11px", height: "11px" }} /> {meta.calcExp}y experience
                          </span>
                        )}
                        {meta.availability?.status && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: meta.availability.status === "Available" ? "#065f46" : "#92400e",
                              background: meta.availability.status === "Available" ? "#d1fae5" : "#fef3c7",
                              padding: "1px 7px",
                              borderRadius: "5px",
                            }}
                          >
                            {meta.availability.status}
                          </span>
                        )}
                      </div>
                      {meta.skills.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                          {meta.skills.slice(0, 5).map((s, i) => (
                            <span
                              key={i}
                              style={{
                                background: "#f0fdf4",
                                color: "#065f46",
                                border: "1px solid #d1fae5",
                                borderRadius: "5px",
                                padding: "1px 7px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {s.name}
                            </span>
                          ))}
                          {meta.skills.length > 5 && (
                            <span style={{ fontSize: "11px", color: "#6b7280" }}>+{meta.skills.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* AI Explanation */}
              {selectedCandidate.explanation && (
                <div
                  style={{
                    padding: "14px 16px",
                    background: "#f0f9ff",
                    borderRadius: "12px",
                    border: "1px solid #bae6fd",
                    borderLeft: "4px solid #0284c7",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    AI Assessment
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#0c4a6e", lineHeight: 1.65 }}>
                    {selectedCandidate.explanation}
                  </p>
                </div>
              )}

              {/* Strengths */}
              {selectedCandidate.strengths && selectedCandidate.strengths.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                    <Star style={{ width: "15px", height: "15px", color: "#059669" }} />
                    <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#111827" }}>Strengths</h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selectedCandidate.strengths.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          padding: "8px 12px",
                          background: "#f0fdf4",
                          borderRadius: "8px",
                          border: "1px solid #d1fae5",
                        }}
                      >
                        <CheckCircle style={{ width: "13px", height: "13px", color: "#10b981", flexShrink: 0, marginTop: "1px" }} />
                        <span style={{ fontSize: "12px", color: "#064e3b", lineHeight: 1.55 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps */}
              {(selectedCandidate.gapsAndRisks || (selectedCandidate as { gaps?: string[] }).gaps) && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                    <AlertTriangle style={{ width: "15px", height: "15px", color: "#d97706" }} />
                    <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#111827" }}>Gaps & Risks</h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(selectedCandidate.gapsAndRisks || (selectedCandidate as { gaps?: string[] }).gaps || []).map((g, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          padding: "8px 12px",
                          background: "#fff7ed",
                          borderRadius: "8px",
                          border: "1px solid #fed7aa",
                        }}
                      >
                        <AlertTriangle style={{ width: "12px", height: "12px", color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                        <span style={{ fontSize: "12px", color: "#7c2d12", lineHeight: 1.55 }}>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View full profile button */}
              <button
                onClick={() => {
                  setProfileModalApplicant(selectedApplicant);
                  setProfileModalOpen(true);
                }}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1.5px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  transition: "background 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f9fafb")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "white")}
              >
                <User style={{ width: "14px", height: "14px" }} />
                View Full Talent Profile
              </button>
            </div>
          </div>
        </>
      )}

      {/* Full profile modal */}
      <ApplicantDetailModal
        applicant={profileModalApplicant}
        isOpen={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setProfileModalApplicant(null); }}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}