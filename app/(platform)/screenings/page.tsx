"use client";

import { useMemo, useState } from "react";
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
  const [selectedJobId, setSelectedJobId] = useState<string>("");
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

  return (
    <div className="space-y-6">
      {status && <ActionMessage type={status.type} message={status.text} />}
      {screeningsError && (
        <ActionMessage
          type="error"
          message="Could not load screenings. Verify MongoDB settings and try again."
        />
      )}
      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="text-xl font-bold text-primary">Run AI Screening</h2>
        <p className="mt-1 text-sm text-gray-600">
          Gemini compares all selected applicants at once and returns a merit-based top 10 or top 20.
        </p>

        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-black">Quick Trigger</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className="min-w-[220px] rounded-lg border border-border px-3 py-2 text-sm"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              <option value="">Select job</option>
              {(jobs ?? []).map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
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
              disabled={!selectedJobId}
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
              Trigger Screening
            </Button>
          </div>
          {!jobs?.length && (
            <p className="mt-2 text-xs text-gray-600">Create at least one job first to trigger screening.</p>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(jobs ?? []).map((job) => (
            <article key={job._id} className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-black">{job.title}</h3>
              <p className="mt-1 text-sm text-gray-700 line-clamp-3">{job.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setTopNByJob((prev) => ({ ...prev, [job._id]: prev[job._id] === 20 ? 10 : 20 }))
                  }
                >
                  Target: Top {topNByJob[job._id] ?? 10}
                </Button>
                <Button
                  onClick={async () => {
                    const target = topNByJob[job._id] ?? 10;
                    try {
                      setStatus({
                        type: "info",
                        text: `Starting AI screening for ${job.title} (Top ${target})...`,
                      });
                      const response = await runScreening({ jobId: job._id, topN: target }).unwrap();
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
                  Trigger Screening
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isRunning && (
        <section className="rounded-xl border border-border bg-white p-5">
          <h3 className="text-lg font-semibold text-primary">AI is analyzing candidates...</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-border p-4">
                <div className="skeleton-shimmer h-5 w-2/3 rounded" />
                <div className="skeleton-shimmer mt-3 h-3 w-full rounded" />
                <div className="skeleton-shimmer mt-2 h-3 w-5/6 rounded" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-black">Shortlist Results</h3>
          <div className="flex gap-2">
            <Button
              variant={shortlistViewMode === "card" ? "primary" : "secondary"}
              onClick={() => setShortlistViewMode("card")}
            >
              Card View
            </Button>
            <Button
              variant={shortlistViewMode === "row" ? "primary" : "secondary"}
              onClick={() => setShortlistViewMode("row")}
            >
              Row View
            </Button>
          </div>
        </div>
        <div className={`mt-4 ${shortlistViewMode === "card" ? "grid gap-3" : "space-y-2"}`}>
          {(latestCompleted?.rankedCandidates ?? []).map((candidate, index) => {
            const applicant = applicants?.find(
              (item) => String(item._id) === String(candidate.applicantId)
            );
            return (
              <button
                key={`${candidate.applicantId}-${index}`}
                type="button"
                onClick={() =>
                  {
                    setSelectedCandidate({
                      rank: candidate.rank,
                      recommendation: candidate.recommendation,
                      name: applicant?.fullName ?? "Candidate",
                      explanation: candidate.explanation,
                      strengths: candidate.strengths,
                      gapsAndRisks: candidate.gapsAndRisks,
                    });
                    setPreviewOpen(true);
                  }
                }
                className={cn(
                  "rounded-lg border border-border p-4 text-left transition hover:border-primary",
                  "flex items-center justify-between",
                  shortlistViewMode === "row" && "rounded-md"
                )}
              >
                <div>
                  <p className="font-semibold text-black">#{candidate.rank || index + 1} {applicant?.fullName ?? "Candidate"}</p>
                  <p className="text-sm text-gray-700">{applicant?.email ?? "Unknown email"}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">{candidate.recommendation}</p>
                </div>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  {candidate.matchScore}/100
                </span>
              </button>
            );
          })}
          {!latestCompleted?.rankedCandidates?.length && (
            <p className="text-sm text-gray-600">Run a screening to see ranked candidates.</p>
          )}
        </div>
      </div>
      </section>
      {previewOpen && (
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-auto border-l border-border bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black">Candidate Explanation Panel</h3>
        <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
          Close
        </Button>
        </div>
        {!selectedCandidate ? (
          <p className="mt-3 text-sm text-gray-600">
            Click any shortlisted candidate to open full explanation, strengths, and risks.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-base font-bold text-primary">
              #{selectedCandidate.rank} {selectedCandidate.name}
            </p>
            <p className="text-xs font-semibold text-primary">{selectedCandidate.recommendation}</p>
            <p className="text-sm text-gray-800">{selectedCandidate.explanation}</p>
            <div>
              <p className="text-sm font-semibold text-black">Strengths</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {selectedCandidate.strengths.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Gaps / Risks</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {selectedCandidate.gapsAndRisks.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </aside>
      )}
    </div>
  );
}
