"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useGetApplicantsQuery,
  useGetDashboardSummaryQuery,
  useGetScreeningsQuery,
} from "@/redux/services/api";

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummaryQuery();
  const { data: applicants } = useGetApplicantsQuery();
  const { data: screenings } = useGetScreeningsQuery();
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    title: string;
    content: {
      applicant: any;
      screeningInsight?: any;
      aiStatus?: string;
    };
  } | null>(null);

  // Pagination states
  const [shortPage, setShortPage] = useState(1);
  const [unshortPage, setUnshortPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
  
  const unshortlisted = useMemo(
    () => applicants?.filter((applicant) => !shortlistedIds.has(String(applicant._id))) ?? [],
    [applicants, shortlistedIds]
  );

  // Apply pagination slices
  const paginatedShortlisted = shortlisted.slice((shortPage - 1) * ITEMS_PER_PAGE, shortPage * ITEMS_PER_PAGE);
  const paginatedUnshortlisted = unshortlisted.slice((unshortPage - 1) * ITEMS_PER_PAGE, unshortPage * ITEMS_PER_PAGE);

  const closePreview = () => setPreviewOpen(false);

  // Helper to extract the most accurate name
  const getApplicantName = (candidate: any) => {
    if (candidate?.fullName) return candidate.fullName;
    if (candidate?.structuredProfile?.firstName) {
      return `${candidate.structuredProfile.firstName} ${candidate.structuredProfile.lastName || ''}`.trim();
    }
    return "Unknown Candidate";
  };

  // Helper function to dynamically parse and format objects instead of showing "Complex data"
  const formatApplicantData = (value: unknown) => {
    if (value === null || value === undefined || value === "") return <span className="text-gray-400 italic">Not provided</span>;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : <span className="text-gray-400 italic">None</span>;
    
    // Better handling for objects
    if (typeof value === "object") {
      try {
        return (
          <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
            {Object.entries(value).map(([k, v]) => {
              if (v === null || v === undefined || v === "") return null;
              // Prevent infinite deep nesting
              if (typeof v === "object") {
                 // Check if it's an array to join it, otherwise skip deep render
                 if (Array.isArray(v)) {
                   return <li key={k}><span className="font-semibold text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> {v.join(", ")}</li>;
                 }
                 return null;
              }
              return (
                <li key={k}>
                  <span className="font-semibold text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> {String(v)}
                </li>
              );
            })}
          </ul>
        );
      } catch {
        return <span className="text-gray-500 italic">Complex data</span>;
      }
    }
    
    const strValue = String(value);
    if (strValue.startsWith("http://") || strValue.startsWith("https://")) {
      return (
        <a href={strValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {strValue}
        </a>
      );
    }
    return <span className="break-words">{strValue}</span>;
  };

  // Helper to merge root and structured profile for the UI loop
  const getProfileDisplayData = (applicant: any) => {
    if (!applicant) return {};
    return { ...applicant, ...(applicant.structuredProfile || {}) };
  };

  // Fields to hide from the dynamic loop since they are DB clutter or already shown
  const ignoredKeys = [
    "_id", "id", "fullName", "firstName", "lastName", "email", 
    "phone", "location", "__v", "createdAt", "updatedAt", 
    "profileData", "structuredProfile", "raw"
  ];

  return (
    <>
      <div className="space-y-6 pb-10">
        {/* Header Section */}
        <section className="rounded-2xl bg-gradient-to-r from-primary to-blue-700 p-8 text-white shadow-md">
          <h2 className="text-3xl font-bold tracking-tight">Recruiter Command Center</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/90 leading-relaxed">
            Manage jobs, ingest applicants, and run Gemini-powered rankings from a single, streamlined dashboard.
          </p>
        </section>

        {/* Metrics Section */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Active Jobs", value: summary?.jobs ?? 0 },
            { label: "Total Applicants", value: summary?.applicants ?? 0 },
            { label: "Screening Runs", value: summary?.screenings ?? 0 },
          ].map((item) => (
            <article key={item.label} className="flex flex-col justify-center rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <p className="text-sm font-medium text-gray-500">{item.label}</p>
              {isLoading ? (
                <div className="skeleton-shimmer mt-3 h-10 w-24 rounded-md bg-gray-200" />
              ) : (
                <p className="mt-2 text-4xl font-extrabold text-primary">{item.value}</p>
              )}
            </article>
          ))}
        </section>

        {/* Latest Activity Section */}
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-border pb-3">Latest Screening Activity</h3>
          <div className="mt-4 space-y-3">
            {(screenings ?? []).slice(0, 5).map((screening) => (
              <div
                key={screening._id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">Screening #{screening._id.slice(-6)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Top {screening.topN} shortlist configuration</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  screening.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {screening.status.charAt(0).toUpperCase() + screening.status.slice(1)}
                </span>
              </div>
            ))}
            {!screenings?.length && <p className="text-sm text-gray-500 italic py-2">No screening history available.</p>}
          </div>
        </section>

        {/* Candidates Section */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Shortlisted Column */}
          <article className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Shortlisted Candidates</h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {shortlisted.length}
              </span>
            </div>
            <div className="flex-1 space-y-3">
              {paginatedShortlisted.map((candidate) => (
                <button
                  key={candidate._id}
                  type="button"
                  className="group flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
                  onClick={() => {
                    setSelectedPreview({
                      title: "Shortlisted Candidate",
                      content: {
                        applicant: candidate,
                        screeningInsight:
                          latestCompleted?.rankedCandidates.find(
                            (item) => String(item.applicantId) === String(candidate._id)
                          ) ?? {},
                      },
                    });
                    setPreviewOpen(true);
                  }}
                >
                  <div>
                    <span className="block text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{getApplicantName(candidate)}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">View AI Insights</span>
                  </div>
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
              {!shortlisted.length && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-gray-500">No candidates have been shortlisted yet.</p>
                </div>
              )}
            </div>
            
            {/* Shortlisted Pagination Controls */}
            {shortlisted.length > ITEMS_PER_PAGE && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShortPage(p => Math.max(1, p - 1))}
                  disabled={shortPage === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-500 font-medium">
                  Page {shortPage} of {Math.ceil(shortlisted.length / ITEMS_PER_PAGE)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShortPage(p => Math.min(Math.ceil(shortlisted.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={shortPage === Math.ceil(shortlisted.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </article>

          {/* Unshortlisted Column */}
          <article className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Unshortlisted Candidates</h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {unshortlisted.length}
              </span>
            </div>
            <div className="flex-1 space-y-3">
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
                        aiStatus: "Did not meet the threshold for the latest shortlist." 
                      },
                    });
                    setPreviewOpen(true);
                  }}
                >
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">{getApplicantName(candidate)}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">View Profile</span>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
              {!unshortlisted.length && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-gray-500">All available candidates are currently shortlisted.</p>
                </div>
              )}
            </div>

            {/* Unshortlisted Pagination Controls */}
            {unshortlisted.length > ITEMS_PER_PAGE && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUnshortPage(p => Math.max(1, p - 1))}
                  disabled={unshortPage === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-500 font-medium">
                  Page {unshortPage} of {Math.ceil(unshortlisted.length / ITEMS_PER_PAGE)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUnshortPage(p => Math.min(Math.ceil(unshortlisted.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={unshortPage === Math.ceil(unshortlisted.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </article>
        </section>
      </div>

      {/* Slide-Over Drawer */}
      {previewOpen && selectedPreview && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity" 
            onClick={closePreview}
            aria-hidden="true"
          />
          
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-lg animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  {selectedPreview.title}
                </p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {getApplicantName(selectedPreview.content.applicant)}
                </h3>
              </div>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-gray-200" onClick={closePreview}>
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="relative flex-1 overflow-y-auto px-6 py-6">
              
              {/* AI Insights Card */}
              {selectedPreview.content.screeningInsight && Object.keys(selectedPreview.content.screeningInsight).length > 0 && (
                <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="mb-3 flex items-center justify-between border-b border-primary/10 pb-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M19.467 4.533l-1.8-1.8L16 4.4l1.667 1.667L16 7.733l1.667 1.667 1.8-1.8 1.8 1.8 1.666-1.667-1.666-1.667 1.666-1.667zM8.533 2.667L6.4 7.333 1.733 9.467l4.667 2.133L8.533 16.267l2.134-4.667 4.666-2.133-4.666-2.134z"/>
                      </svg>
                      <h4 className="font-semibold text-primary">Gemini Screening Analysis</h4>
                    </div>
                    {selectedPreview.content.screeningInsight.score && (
                      <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        Score: {selectedPreview.content.screeningInsight.score}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                    {selectedPreview.content.screeningInsight.rationale ? (
                      <p>{selectedPreview.content.screeningInsight.rationale}</p>
                    ) : (
                      <p className="italic opacity-80">Ranking applied, but no specific textual rationale was generated for this candidate.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Notice for unshortlisted */}
              {selectedPreview.content.aiStatus && (
                <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
                   <p className="text-sm font-medium text-gray-600">{selectedPreview.content.aiStatus}</p>
                </div>
              )}

              {/* Improved Applicant Details */}
              <div>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">
                  Applicant Information
                </h4>
                <dl className="space-y-4 text-sm">
                  {/* Fixed top priority fields leveraging structured profile directly */}
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">Email Address</dt>
                    <dd className="col-span-2 text-gray-900">{formatApplicantData(selectedPreview.content.applicant?.email || selectedPreview.content.applicant?.structuredProfile?.email)}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">Phone Number</dt>
                    <dd className="col-span-2 text-gray-900">{formatApplicantData(selectedPreview.content.applicant?.phone || selectedPreview.content.applicant?.structuredProfile?.phone)}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="font-medium text-gray-500">Location</dt>
                    <dd className="col-span-2 text-gray-900">{formatApplicantData(selectedPreview.content.applicant?.location || selectedPreview.content.applicant?.structuredProfile?.location)}</dd>
                  </div>
                  
                  {/* Dynamic rendering with flattened data */}
                  {Object.entries(getProfileDisplayData(selectedPreview.content.applicant)).map(([key, value]) => {
                    if (ignoredKeys.includes(key)) return null;
                    
                    return (
                      <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-2" key={key}>
                        <dt className="font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                        <dd className="col-span-2 text-gray-900">
                          {formatApplicantData(value)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
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