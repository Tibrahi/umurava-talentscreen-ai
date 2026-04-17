"use client";

import { useMemo, useState } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { JobCard } from "@/components/ui/job-card";
import { JobDetailPanel } from "@/components/ui/job-detail-panel";
import { Badge } from "@/components/ui/badge";
import { splitCommaValues } from "@/lib/utils";
import type { JobInput } from "@/lib/types";
import {
  useCreateJobMutation,
  useDeleteJobMutation,
  useGetJobsQuery,
  useUpdateJobMutation,
} from "@/redux/services/api";
import { Briefcase, Plus } from "lucide-react";

const initialForm: JobInput = {
  title: "",
  description: "",
  requiredSkills: [],
  minimumExperience: 0,
  education: "",
  location: "",
  employmentType: "Full-time",
};

export default function JobsPage() {
  const { data: jobs, error: jobsError } = useGetJobsQuery();
  const [createJob, { isLoading: creating }] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();
  const [deleteJob] = useDeleteJobMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState("");
  const [experienceDraft, setExperienceDraft] = useState("0 years");
  const [form, setForm] = useState<JobInput>(initialForm);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobPreviewOpen, setJobPreviewOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [jobViewMode, setJobViewMode] = useState<"card" | "row">("card");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );

  const title = useMemo(() => (editingId ? "Edit Job Role" : "Create New Job"), [editingId]);
  const jobsErrorMessage = useMemo(() => {
    if (!jobsError) return "";
    const apiError = jobsError as FetchBaseQueryError & { data?: { message?: string } };
    return (
      apiError?.data?.message ||
      "Could not load jobs. Check your MongoDB connection in .env.local."
    );
  }, [jobsError]);
  const selectedJob = useMemo(
    () => jobs?.find((job) => job._id === selectedJobId) ?? jobs?.[0],
    [jobs, selectedJobId]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedExperience = Number(experienceDraft.match(/\d+/)?.[0] ?? "0");
    const payload = {
      ...form,
      minimumExperience: parsedExperience,
      requiredSkills: splitCommaValues(skillDraft),
    };
    try {
      setStatus({ type: "info", text: editingId ? "Updating job..." : "Creating job..." });
      if (editingId) {
        await updateJob({ id: editingId, data: payload }).unwrap();
      } else {
        await createJob(payload).unwrap();
      }
      setStatus({ type: "success", text: editingId ? "Job updated successfully." : "Job created successfully." });
    } catch {
      setStatus({ type: "error", text: "Could not save job. Please check your configuration and try again." });
    }
    setEditingId(null);
    setSkillDraft("");
    setExperienceDraft("0 years");
    setForm(initialForm);
  };

  // Description rendering detects heading-like lines and bullet-like lines for cleaner readability.
  const renderDescription = (description: string) => {
    const lines = description.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return <p className="text-sm text-gray-700">{description}</p>;
    return (
      <div className="space-y-1 text-sm text-gray-700">
        {lines.map((line, index) => {
          const looksLikeHeading =
            /^[A-Z][A-Za-z\s]{3,20}:?$/.test(line) || /^\d+\.\s+/.test(line);
          const looksLikeBullet = /^[-*•]\s+/.test(line);
          if (looksLikeHeading) {
            return (
              <p key={`${line}-${index}`} className="font-semibold text-black">
                {line}
              </p>
            );
          }
          if (looksLikeBullet) {
            return (
              <p key={`${line}-${index}`} className="pl-3">
                - {line.replace(/^[-*•]\s+/, "")}
              </p>
            );
          }
          return <p key={`${line}-${index}`}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Create/Edit Job Section */}
        <section className="rounded-2xl border-2 border-border bg-gradient-to-br from-white to-primary/5 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-primary">{title}</h2>
          </div>

          {status && (
            <div className="mb-3">
              <ActionMessage type={status.type} message={status.text} />
            </div>
          )}

          {jobsError && (
            <div className="mb-3">
              <ActionMessage type="error" message={jobsErrorMessage} />
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["title", "Job Title"],
                ["education", "Education Requirement"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-black mb-2">{label}</label>
                  <input
                    className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none"
                    value={form[key as keyof JobInput] as string}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    required
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["location", "Location"],
                ["employmentType", "Employment Type"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-black mb-2">{label}</label>
                  <input
                    className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none"
                    value={form[key as keyof JobInput] as string}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    required
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Job Description
              </label>
              <textarea
                className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none resize-none h-32"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe the role, responsibilities, and requirements..."
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Tip: Use headings and bullet points for better formatting
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Required Skills (comma separated)
                </label>
                <input
                  className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none"
                  value={skillDraft}
                  onChange={(event) => setSkillDraft(event.target.value)}
                  placeholder="TypeScript, Node.js, React"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Minimum Experience
                </label>
                <input
                  className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none"
                  value={experienceDraft}
                  onChange={(event) => setExperienceDraft(event.target.value)}
                  placeholder="e.g. 3 years, 2+ years"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={creating} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {editingId ? "Update Job" : "Create Job"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setSkillDraft("");
                    setExperienceDraft("0 years");
                    setForm(initialForm);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </section>

        {/* Job Listings Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Briefcase className="h-6 w-6" />
                Active Job Openings
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {jobs?.length ?? 0} position{jobs?.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          {!jobs?.length ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-gray-50 to-white p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold">No jobs created yet</p>
              <p className="text-sm text-gray-600 mt-1">
                Create your first job opening above to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {(jobs ?? []).map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  isSelected={selectedJobId === job._id}
                  onSelect={() => {
                    setSelectedJobId(job._id);
                    setJobPreviewOpen(true);
                  }}
                  onEdit={() => {
                    setEditingId(job._id);
                    setSkillDraft(job.requiredSkills.join(", "));
                    setExperienceDraft(`${job.minimumExperience} years`);
                    setForm({
                      title: job.title,
                      description: job.description,
                      requiredSkills: job.requiredSkills,
                      minimumExperience: job.minimumExperience,
                      education: job.education,
                      location: job.location,
                      employmentType: job.employmentType,
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onDelete={async () => {
                    try {
                      setStatus({ type: "info", text: "Deleting job..." });
                      await deleteJob(job._id).unwrap();
                      setStatus({ type: "success", text: "Job deleted successfully." });
                    } catch {
                      setStatus({ type: "error", text: "Failed to delete job." });
                    }
                  }}
                  isExpanded={expanded[job._id] ?? false}
                  onToggleExpand={() => {
                    setExpanded((prev) => ({ ...prev, [job._id]: !prev[job._id] }));
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Job Detail Panel */}
      <JobDetailPanel
        job={selectedJob ?? null}
        isOpen={jobPreviewOpen}
        onClose={() => setJobPreviewOpen(false)}
      />
    </>
  );
}
