"use client";

import { useMemo, useState } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { splitCommaValues } from "@/lib/utils";
import type { JobInput } from "@/lib/types";
import {
  useCreateJobMutation,
  useDeleteJobMutation,
  useGetJobsQuery,
  useUpdateJobMutation,
} from "@/redux/services/api";

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
      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="text-xl font-bold text-primary">{title}</h2>
        {status && <div className="mt-3"><ActionMessage type={status.type} message={status.text} /></div>}
        {jobsError && (
          <div className="mt-3">
            <ActionMessage type="error" message={jobsErrorMessage} />
          </div>
        )}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          {[
            ["title", "Job Title"],
            ["description", "Description"],
            ["education", "Education Requirement"],
            ["location", "Location"],
            ["employmentType", "Employment Type"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-sm font-semibold text-black">{label}</label>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={form[key as keyof JobInput] as string}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [key]: event.target.value }))
                }
                required
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-semibold text-black">Required Skills (comma separated)</label>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={skillDraft}
              onChange={(event) => setSkillDraft(event.target.value)}
              placeholder="TypeScript, Node.js, ATS"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-black">Minimum Experience</label>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={experienceDraft}
              onChange={(event) => setExperienceDraft(event.target.value)}
              placeholder="e.g. 3 years, 2+ years"
            />
          </div>
          <Button type="submit" disabled={creating}>
            {editingId ? "Update Job" : "Create Job"}
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-black">Job Listings</h3>
          <div className="flex gap-2">
            <Button
              variant={jobViewMode === "card" ? "primary" : "secondary"}
              onClick={() => setJobViewMode("card")}
            >
              Card View
            </Button>
            <Button
              variant={jobViewMode === "row" ? "primary" : "secondary"}
              onClick={() => setJobViewMode("row")}
            >
              Row View
            </Button>
          </div>
        </div>

        <div className={`mt-4 ${jobViewMode === "card" ? "grid gap-3 md:grid-cols-2" : "space-y-3"}`}>
          {(jobs ?? []).map((job) => (
            <article
              key={job._id}
              className={`rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition hover:border-primary/40 hover:shadow-md ${
                jobViewMode === "row" ? "flex items-start justify-between gap-4" : ""
              }`}
              onClick={() => {
                setSelectedJobId(job._id);
                setJobPreviewOpen(true);
              }}
            >
              <div className="flex-1">
                <h4 className="font-semibold text-primary">{job.title}</h4>
                <div className={`mt-2 ${expanded[job._id] ? "" : "line-clamp-3"}`}>
                  {renderDescription(job.description)}
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-primary underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((prev) => ({ ...prev, [job._id]: !prev[job._id] }));
                    setSelectedJobId(job._id);
                  }}
                >
                  {expanded[job._id] ? "Show less" : "Show more"}
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
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
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      setStatus({ type: "info", text: "Deleting job..." });
                      await deleteJob(job._id).unwrap();
                      setStatus({ type: "success", text: "Job deleted successfully." });
                    } catch {
                      setStatus({ type: "error", text: "Failed to delete job." });
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
          {!jobs?.length && <p className="text-sm text-gray-600">No jobs created yet.</p>}
        </div>
      </section>
    </div>
      {jobPreviewOpen && (
        <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-auto border-l border-border bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Job Detail Preview</h3>
            <Button variant="ghost" onClick={() => setJobPreviewOpen(false)}>
              Close
            </Button>
          </div>
          {!selectedJob ? (
            <p className="mt-3 text-sm text-gray-600">Select a job to preview full details.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="font-semibold text-black">Title</p>
                <p>{selectedJob.title}</p>
              </div>
              <div>
                <p className="font-semibold text-black">Description</p>
                <p className="whitespace-pre-wrap">{selectedJob.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-semibold text-black">Experience</p>
                  <p>{selectedJob.minimumExperience} years</p>
                </div>
                <div>
                  <p className="font-semibold text-black">Employment</p>
                  <p>{selectedJob.employmentType}</p>
                </div>
                <div>
                  <p className="font-semibold text-black">Education</p>
                  <p>{selectedJob.education}</p>
                </div>
                <div>
                  <p className="font-semibold text-black">Location</p>
                  <p>{selectedJob.location}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-black">Required Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedJob.requiredSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-primary px-2 py-1 text-xs text-white">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
