"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useGetApplicantsQuery,
  useGetDashboardSummaryQuery,
  useGetScreeningsQuery,
} from "@/redux/services/api";
import { cn } from "@/components/ui/cn";

// Define the state types for our new dynamic drawer
type DrawerState =
  | { type: "candidate"; candidate: any; insight: any }
  | { type: "screening"; screening: any }
  | null;

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummaryQuery();
  const { data: applicants } = useGetApplicantsQuery();
  const { data: screenings } = useGetScreeningsQuery();
  
  const [drawerState, setDrawerState] = useState<DrawerState>(null);

  // Pagination State for "All Applicants"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Memoized computations
  const latestCompleted = useMemo(
    () => screenings?.find((screening) => screening.status === "completed"),
    [screenings]
  );
  
  const shortlistedIds = useMemo(
    () => new Set((latestCompleted?.rankedCandidates ?? []).map((item) => String(item.applicantId))),
    [latestCompleted]
  );
  
  const shortlisted = useMemo(
    () => applicants?.filter((applicant) => shortlistedIds.has(String(applicant._id))) ?? [],
    [applicants, shortlistedIds]
  );

  // Pagination Logic for All Applicants
  const allApplicantsCount = applicants?.length || 0;
  const totalPages = Math.ceil(allApplicantsCount / itemsPerPage);
  
  const paginatedApplicants = useMemo(() => {
    if (!applicants) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return applicants.slice(startIndex, startIndex + itemsPerPage);
  }, [applicants, currentPage]);

  return (
    <>
      <div className="space-y-6 pb-10">
        <section className="rounded-2xl bg-gradient-to-r from-primary to-blue-600 p-8 text-white shadow-lg">
          <h2 className="text-3xl font-extrabold tracking-tight">Recruiter Command Center</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/80 font-medium">
            Manage jobs, ingest applicants, and run Gemini-powered rankings from a single dashboard.
          </p>
        </section>

        {/* Stats Row */}
        <section className="grid gap-5 md:grid-cols-3">
          {[
            { label: "Active Jobs", value: summary?.jobs ?? 0 },
            { label: "Total Applicants", value: summary?.applicants ?? 0 },
            { label: "Screening Runs", value: summary?.screenings ?? 0 },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <p className="text-sm font-semibold text-gray-500">{item.label}</p>
              {isLoading ? (
                <div className="mt-3 h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
              ) : (
                <p className="mt-3 text-4xl font-black text-primary">{item.value}</p>
              )}
            </article>
          ))}
        </section>

        {/* Latest Screenings */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900">Latest Screening Activity</h3>
          <p className="text-sm text-gray-500 mb-4">Click any screening run to view its detailed report.</p>
          <div className="space-y-3">
            {(screenings ?? []).slice(0, 5).map((screening) => (
              <button
                key={screening._id}
                onClick={() => setDrawerState({ type: "screening", screening })}
                className="group w-full flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-left transition-all hover:border-primary/40 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-primary">
                      Task ID: #{screening._id.slice(-8)}
                    </p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                      Target: Top {screening.topN} Candidates
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold capitalize",
                  screening.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                )}>
                  {screening.status}
                </span>
              </button>
            ))}
            {!screenings?.length && <p className="text-sm italic text-gray-500 py-4">No screenings initiated yet.</p>}
          </div>
        </section>

        {/* Two Columns: Shortlisted vs All Applicants */}
        <section className="grid gap-6 lg:grid-cols-2">
          
          {/* Column 1: Shortlisted (Interactive) */}
          <article className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">Latest Shortlist</h3>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                {shortlisted.length} Matches
              </span>
            </div>
            <div className="flex-1 p-5 space-y-3 max-h-[500px] overflow-y-auto">
              {shortlisted.map((candidate) => {
                const insight = latestCompleted?.rankedCandidates.find(
                  (item) => String(item.applicantId) === String(candidate._id)
                );
                return (
                  <button
                    key={candidate._id}
                    type="button"
                    className="group flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-primary hover:shadow-md"
                    onClick={() => setDrawerState({ type: "candidate", candidate, insight })}
                  >
                    <div>
                      <span className="text-sm font-bold text-gray-900 block group-hover:text-primary transition-colors">
                        {candidate.fullName}
                      </span>
                      {insight && (
                        <span className="text-xs font-medium text-gray-500 mt-1 block line-clamp-1">
                          Score: {insight.matchScore}/100 • Rank #{insight.rank}
                        </span>
                      )}
                    </div>
                    <div className="rounded-full bg-gray-100 p-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
              {!shortlisted.length && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No shortlisted candidates from the latest run.
                </div>
              )}
            </div>
          </article>

          {/* Column 2: All Applicants (Paginated, View Only) */}
          <article className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">All Applicants</h3>
                <p className="text-xs text-gray-500 mt-0.5">Global database view</p>
              </div>
              <span className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-bold text-gray-700">
                Total: {allApplicantsCount}
              </span>
            </div>
            
            <div className="flex-1 p-5 space-y-3 min-h-[400px]">
              {paginatedApplicants.map((candidate) => (
                <div
                  key={candidate._id}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 font-bold text-gray-600 text-xs">
                      {candidate.fullName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-800">{candidate.fullName}</span>
                      <span className="text-xs text-gray-500 block truncate max-w-[200px]">{candidate.email}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {!paginatedApplicants.length && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No applicants available in the system.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 rounded-b-2xl flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg shadow-sm"
                >
                  Previous
                </Button>
                <span className="text-xs font-bold text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg shadow-sm"
                >
                  Next
                </Button>
              </div>
            )}
          </article>
        </section>
      </div>

      {/* Dynamic Slide-out Drawer */}
      {drawerState && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm transition-opacity" 
            onClick={() => setDrawerState(null)} 
          />
          <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl animate-in slide-in-from-right sm:max-w-2xl">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 bg-gray-50/80">
              <h3 className="text-xl font-extrabold text-gray-900">
                {drawerState.type === "candidate" ? "Candidate AI Assessment" : "Screening Run Details"}
              </h3>
              <Button variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-gray-200" onClick={() => setDrawerState(null)}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              
              {/* VIEW 1: Candidate Deep Dive */}
              {drawerState.type === "candidate" && (
                <div className="space-y-6">
                  <div className="border-b border-gray-100 pb-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-3xl font-black text-gray-900">{drawerState.candidate.fullName}</h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">{drawerState.candidate.email}</p>
                      </div>
                      {drawerState.insight?.rank && (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Rank</span>
                          <span className="text-3xl font-black text-primary">#{drawerState.insight.rank}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {drawerState.insight ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Match Score</p>
                          <p className="text-xl font-bold text-gray-900">{drawerState.insight.matchScore} / 100</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Verdict</p>
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-1 text-sm font-bold",
                            drawerState.insight.recommendation.toLowerCase().includes("strong") ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          )}>
                            {drawerState.insight.recommendation}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-5">
                        <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          AI Reasoning
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{drawerState.insight.explanation}</p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-xl border border-green-100 bg-green-50/30 p-5">
                          <h4 className="text-sm font-bold text-green-800 mb-3">Core Strengths</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            {(drawerState.insight.strengths || []).map((s: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-green-500 font-bold">✓</span> <span className="leading-snug">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50/30 p-5">
                          <h4 className="text-sm font-bold text-red-800 mb-3">Gaps & Risks</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            {(drawerState.insight.gapsAndRisks || []).map((r: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-red-400 font-bold">✕</span> <span className="leading-snug">{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">
                      No detailed AI insights available for this candidate.
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: Screening Task Details */}
              {drawerState.type === "screening" && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Task ID</p>
                          <p className="text-sm font-bold text-gray-900 truncate">#{drawerState.screening._id}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Status</p>
                          <span className="inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-sm font-bold capitalize text-gray-800">
                            {drawerState.screening.status}
                          </span>
                        </div>
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mt-6">
                      Ranked Output (Top {drawerState.screening.topN})
                    </h4>
                    
                    {drawerState.screening.rankedCandidates?.length > 0 ? (
                      <div className="space-y-3">
                        {drawerState.screening.rankedCandidates.map((rankItem: any, idx: number) => {
                           const matchedApp = applicants?.find(a => String(a._id) === String(rankItem.applicantId));
                           return (
                             <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-sm">
                                <div className="flex items-center gap-4">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                                    {rankItem.rank}
                                  </span>
                                  <div>
                                    <p className="font-bold text-sm text-gray-900">{matchedApp?.fullName || "Unknown Applicant"}</p>
                                    <p className="text-xs text-gray-500">Score: {rankItem.matchScore}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100">{rankItem.recommendation}</span>
                             </div>
                           )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No candidates ranked in this task yet.</p>
                    )}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}