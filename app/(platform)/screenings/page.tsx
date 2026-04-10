"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { ActionMessage } from "@/components/ui/action-message";
import { getErrorMessage } from "@/lib/utils";
import {
  useGetApplicantsQuery,
  useGetJobsQuery,
  useGetScreeningsQuery,
  useRunScreeningMutation,
} from "@/redux/services/api";

export default function ScreeningsPage() {
  const { data: jobs } = useGetJobsQuery();
  const { data: applicants } = useGetApplicantsQuery();
  const { data: screenings, error: screeningsError } = useGetScreeningsQuery(undefined, {
    pollingInterval: 6000,
  });
  const [runScreening, { isLoading: isRunning }] = useRunScreeningMutation();
  
  // Custom Dropdown State
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [topNByJob, setTopNByJob] = useState<Record<string, 10 | 20>>({});
  const [shortlistViewMode, setShortlistViewMode] = useState<"card" | "row">("card");
  const [selectedCandidate, setSelectedCandidate] = useState<{
    rank: number;
    recommendation: string;
    name: string;
    explanation: string;
    strengths: string[];
    gapsAndRisks: string[];
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );

  const latestCompleted = useMemo(
    () => screenings?.find((item) => item.status === "completed"),
    [screenings]
  );
  const selectedTopN = selectedJobId ? topNByJob[selectedJobId] ?? 10 : 10;
  const selectedJobTitle = jobs?.find((j) => j._id === selectedJobId)?.title || "Select a job...";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-8 pb-10">
      {status && <ActionMessage type={status.type} message={status.text} />}
      {screeningsError && (
        <ActionMessage
          type="error"
          message="Could not load screenings. Verify MongoDB settings and try again."
        />
      )}

      {/* Main Control Panel */}
      <section className="relative overflow-visible rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Run AI Screening</h2>
          <p className="mt-2 text-sm text-gray-500">
            Gemini compares all selected applicants at once and returns a merit-based top 10 or top 20.
          </p>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-3">
            <label className="text-sm font-semibold text-gray-700">Quick Trigger</label>
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Custom Hover-Based Glassmorphism Dropdown */}
              <div 
                className="relative min-w-[240px]" 
                ref={dropdownRef}
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-primary hover:ring-1 hover:ring-primary focus:outline-none"
                >
                  <span className="truncate">{selectedJobTitle}</span>
                  <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full origin-top-right animate-in fade-in slide-in-from-top-2">
                    <div className="overflow-hidden rounded-xl border border-white/20 bg-white/60 p-1 shadow-xl backdrop-blur-xl backdrop-saturate-150">
                      {(jobs ?? []).map((job) => (
                        <button
                          key={job._id}
                          onClick={() => {
                            setSelectedJobId(job._id);
                            setIsDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                            selectedJobId === job._id
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-gray-700 hover:bg-white/50 hover:text-gray-900"
                          )}
                        >
                          {job.title}
                        </button>
                      ))}
                      {(!jobs || jobs.length === 0) && (
                        <div className="px-3 py-2 text-sm text-gray-500">No jobs available</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                className="rounded-xl transition-all hover:bg-gray-100"
                onClick={() =>
                  selectedJobId &&
                  setTopNByJob((prev) => ({
                    ...prev,
                    [selectedJobId]: prev[selectedJobId] === 20 ? 10 : 20,
                  }))
                }
                disabled={!selectedJobId}
              >
                Target: Top {selectedTopN}
              </Button>
              
              <Button
                className="rounded-xl bg-primary px-6 shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50"
                disabled={!selectedJobId || isRunning}
                onClick={async () => {
                  if (!selectedJobId) return;
                  try {
                    setStatus({
                      type: "info",
                      text: `Starting AI screening (Top ${selectedTopN})...`,
                    });
                    const response = await runScreening({
                      jobId: selectedJobId,
                      topN: selectedTopN,
                    }).unwrap();
                    setStatus({
                      type: response && "message" in (response as object) ? "info" : "success",
                      text:
                        (response as { message?: string })?.message ||
                        "Screening completed. Results loaded below.",
                    });
                  } catch (error) {
                    const message = getErrorMessage(
                      error,
                      "Screening failed. Check Gemini key and DB settings."
                    );
                    setStatus({ type: "error", text: message });
                  }
                }}
              >
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </span>
                ) : (
                  "Trigger Screening"
                )}
              </Button>
            </div>
            {!jobs?.length && (
              <p className="mt-2 text-xs text-red-500 font-medium">Create at least one job first to trigger screening.</p>
            )}
          </div>
        </div>
      </section>

      {isRunning && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
            </span>
            AI is analyzing candidates...
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 shadow-sm">
                <div className="h-5 w-2/3 animate-pulse rounded-md bg-gray-200" />
                <div className="mt-4 h-3 w-full animate-pulse rounded-md bg-gray-200" />
                <div className="mt-2 h-3 w-5/6 animate-pulse rounded-md bg-gray-200" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results Section */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Shortlist Results</h3>
          <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setShortlistViewMode("card")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                shortlistViewMode === "card" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Card View
            </button>
            <button
              onClick={() => setShortlistViewMode("row")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                shortlistViewMode === "row" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Row View
            </button>
          </div>
        </div>

        {/* Dynamic Layout: CSS Grid Cards OR Vertical Rows */}
        <div
          className={cn(
            "mt-6 pb-2",
            shortlistViewMode === "card"
              ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              : "grid gap-3"
          )}
        >
          {(latestCompleted?.rankedCandidates ?? []).map((candidate, index) => {
            const applicant = applicants?.find(
              (item) => String(item._id) === String(candidate.applicantId)
            );
            return (
              <button
                key={`${candidate.applicantId}-${index}`}
                type="button"
                onClick={() => {
                  setSelectedCandidate({
                    rank: candidate.rank,
                    recommendation: candidate.recommendation,
                    name: applicant?.fullName ?? "Candidate",
                    explanation: candidate.explanation,
                    strengths: candidate.strengths,
                    gapsAndRisks: candidate.gapsAndRisks,
                  });
                  setPreviewOpen(true);
                }}
                className={cn(
                  "group relative text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                  shortlistViewMode === "card"
                    ? "flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5"
                    : "flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
                )}
              >
                <div className={shortlistViewMode === "card" ? "flex-1 space-y-4" : "flex items-center gap-6"}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                          {candidate.rank || index + 1}
                        </span>
                        <p className="font-bold text-gray-900 line-clamp-1">
                          {applicant?.fullName ?? "Candidate"}
                        </p>
                      </div>
                      <p className="mt-1 pl-8 text-xs text-gray-500">{applicant?.email ?? "Unknown email"}</p>
                    </div>
                    {shortlistViewMode === "card" && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                        <span className="text-xs font-bold text-primary">{candidate.matchScore}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={shortlistViewMode === "card" ? "pl-8" : ""}>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      candidate.recommendation.toLowerCase().includes("strong") ? "bg-green-100 text-green-800" :
                      candidate.recommendation.toLowerCase().includes("moderate") ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
                      {candidate.recommendation}
                    </span>
                  </div>
                </div>

                {shortlistViewMode === "row" && (
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500">Match Score</span>
                      <span className="text-lg font-bold text-primary">{candidate.matchScore}/100</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
          {!latestCompleted?.rankedCandidates?.length && (
            <div className="col-span-full py-12 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">No candidates analyzed yet</p>
              <p className="mt-1 text-sm text-gray-500">Run a screening to see ranked candidates here.</p>
            </div>
          )}
        </div>
      </section>

      {/* Candidate Detailed Drawer */}
      {previewOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setPreviewOpen(false)} 
          />
          <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right sm:max-w-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-white/50 px-6 py-4 backdrop-blur-md">
              <h3 className="text-xl font-bold text-gray-900">Candidate Deep Dive</h3>
              <Button variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-gray-100" onClick={() => setPreviewOpen(false)}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            {/* Styled Scrollbar Container */}
            <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
              {!selectedCandidate ? (
                <p className="text-sm text-gray-600">
                  Click any shortlisted candidate to open full explanation, strengths, and risks.
                </p>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                        Rank #{selectedCandidate.rank}
                      </span>
                      <h2 className="text-3xl font-extrabold text-gray-900">{selectedCandidate.name}</h2>
                      <p className="mt-2 text-sm font-semibold text-gray-600">
                        Verdict: <span className="text-primary">{selectedCandidate.recommendation}</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 text-sm text-gray-800 border border-blue-100/50 shadow-sm">
                    <p className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI Explanation
                    </p>
                    <p className="leading-relaxed">{selectedCandidate.explanation}</p>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="rounded-2xl border border-green-100 bg-green-50/30 p-6">
                      <p className="text-sm font-bold text-green-900 flex items-center gap-2 mb-4">
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Core Strengths
                      </p>
                      <ul className="space-y-3 text-sm text-gray-700">
                        {selectedCandidate.strengths.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/30 p-6">
                      <p className="text-sm font-bold text-red-900 flex items-center gap-2 mb-4">
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Gaps / Risks
                      </p>
                      <ul className="space-y-3 text-sm text-gray-700">
                        {selectedCandidate.gapsAndRisks.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}