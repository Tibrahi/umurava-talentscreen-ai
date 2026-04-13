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
    content: Record<string, unknown>;
  } | null>(null);

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

  return (
    <>
    <div className="space-y-6">
      <section className="rounded-2xl bg-umurava-gradient p-6 text-white">
        <h2 className="text-2xl font-bold">Recruiter Command Center</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/90">
          Manage jobs, ingest applicants, and run Gemini-powered rankings from a single dashboard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active Jobs", value: summary?.jobs ?? 0 },
          { label: "Applicants", value: summary?.applicants ?? 0 },
          { label: "Screening Runs", value: summary?.screenings ?? 0 },
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-border bg-white p-5">
            <p className="text-sm text-gray-600">{item.label}</p>
            {isLoading ? (
              <div className="skeleton-shimmer mt-3 h-8 w-20 rounded-md" />
            ) : (
              <p className="mt-3 text-3xl font-bold text-primary">{item.value}</p>
            )}
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-white p-5">
        <h3 className="text-lg font-semibold text-black">Latest Screening Activity</h3>
        <div className="mt-4 space-y-3">
          {(screenings ?? []).slice(0, 5).map((screening) => (
            <div
              key={screening._id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-black">Screening #{screening._id.slice(-6)}</p>
                <p className="text-xs text-gray-600">Top {screening.topN} shortlist</p>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                {screening.status}
              </span>
            </div>
          ))}
          {!screenings?.length && <p className="text-sm text-gray-600">No screenings yet.</p>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Shortlisted Candidates</h3>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
              {shortlisted.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {shortlisted.map((candidate) => (
              <button
                key={candidate._id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:border-primary"
                onClick={() => {
                  setSelectedPreview({
                    title: `Shortlisted: ${candidate.fullName}`,
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
                <span className="text-sm font-semibold text-black">{candidate.fullName}</span>
                <span className="text-xs text-primary">Preview</span>
              </button>
            ))}
            {!shortlisted.length && (
              <p className="text-sm text-gray-600">No shortlisted candidates yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Unshortlisted Candidates</h3>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
              {unshortlisted.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {unshortlisted.map((candidate) => (
              <button
                key={candidate._id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:border-primary"
                onClick={() => {
                  setSelectedPreview({
                    title: `Unshortlisted: ${candidate.fullName}`,
                    content: { applicant: candidate, aiStatus: "Not ranked in latest shortlist" },
                  });
                  setPreviewOpen(true);
                }}
              >
                <span className="text-sm font-semibold text-black">{candidate.fullName}</span>
                <span className="text-xs text-primary">Preview</span>
              </button>
            ))}
            {!unshortlisted.length && (
              <p className="text-sm text-gray-600">All candidates are shortlisted or no applicants available.</p>
            )}
          </div>
        </article>
      </section>
    </div>
    {previewOpen && selectedPreview && (
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-auto border-l border-border bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black">{selectedPreview.title}</h3>
          <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
        </div>
        <pre className="mt-4 max-h-[620px] overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
          {JSON.stringify(selectedPreview.content, null, 2)}
        </pre>
      </aside>
    )}
    </>
  );
}
