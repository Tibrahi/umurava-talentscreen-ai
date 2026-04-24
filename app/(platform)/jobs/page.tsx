"use client";

import { useMemo, useState, useRef } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { JobCard } from "@/components/ui/job-card";
import { JobDetailPanel } from "@/components/ui/job-detail-panel";
import { splitCommaValues } from "@/lib/utils";
import type { JobInput } from "@/lib/types";
import {
  useCreateJobMutation,
  useDeleteJobMutation,
  useGetJobsQuery,
  useUpdateJobMutation,
} from "@/redux/services/api";
import {
  Briefcase,
  Plus,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  GraduationCap,
  Code,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const initialForm: JobInput = {
  title: "",
  description: "",
  requiredSkills: [],
  minimumExperience: 0,
  education: "",
  location: "",
  employmentType: "Full-time",
};

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "6px",
          letterSpacing: "0.3px",
          textTransform: "uppercase",
        }}
      >
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1.5px solid #e5e7eb",
  fontSize: "14px",
  color: "#111827",
  background: "white",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.15s",
  fontFamily: "inherit",
};

export default function JobsPage() {
  const { data: jobs, error: jobsError } = useGetJobsQuery();
  const [createJob, { isLoading: creating }] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();
  const [deleteJob] = useDeleteJobMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState("");
  const [experienceDraft, setExperienceDraft] = useState("0");
  const [form, setForm] = useState<JobInput>(initialForm);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobPreviewOpen, setJobPreviewOpen] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [formExpanded, setFormExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title = editingId ? "Edit Job Role" : "Create New Job";

  const jobsErrorMessage = useMemo(() => {
    if (!jobsError) return "";
    const apiError = jobsError as FetchBaseQueryError & { data?: { message?: string } };
    return apiError?.data?.message || "Could not load jobs. Check your MongoDB connection.";
  }, [jobsError]);

  const selectedJob = useMemo(
    () => jobs?.find((job) => job._id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  // Handle job description file upload (txt, pdf text, docx text)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      const text = await file.text();
      setUploadedFile({ name: file.name, content: text });
      // Auto-fill description from file
      setForm((prev) => ({ ...prev, description: text.slice(0, 3000) }));
      setStatus({ type: "success", text: `File "${file.name}" loaded. Review and edit the description below.` });
    } catch {
      setStatus({ type: "error", text: "Could not read file. Try a .txt file." });
    } finally {
      setIsParsingFile(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedExp = parseInt(experienceDraft) || 0;
    const payload: JobInput = {
      ...form,
      minimumExperience: parsedExp,
      requiredSkills: splitCommaValues(skillDraft),
    };
    try {
      setStatus({ type: "info", text: editingId ? "Updating job…" : "Creating job…" });
      if (editingId) {
        await updateJob({ id: editingId, data: payload }).unwrap();
        setStatus({ type: "success", text: "Job updated successfully." });
      } else {
        await createJob(payload).unwrap();
        setStatus({ type: "success", text: "Job created successfully." });
      }
    } catch {
      setStatus({ type: "error", text: "Could not save job. Please check your configuration." });
    }
    setEditingId(null);
    setSkillDraft("");
    setExperienceDraft("0");
    setUploadedFile(null);
    setForm(initialForm);
  };

  const resetForm = () => {
    setEditingId(null);
    setSkillDraft("");
    setExperienceDraft("0");
    setForm(initialForm);
    setUploadedFile(null);
    setStatus(null);
  };

  return (
    <>
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Status */}
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
            {status.type === "success" ? (
              <CheckCircle style={{ width: "16px", height: "16px" }} />
            ) : (
              <AlertCircle style={{ width: "16px", height: "16px" }} />
            )}
            {status.text}
          </div>
        )}

        {/* ── Create/Edit Form ─────────────────────────────── */}
        <section
          style={{
            background: "white",
            borderRadius: "20px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          {/* Form header */}
          <div
            style={{
              padding: "20px 24px",
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setFormExpanded((v) => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                <Briefcase style={{ width: "18px", height: "18px", color: "#6ee7b7" }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "white" }}>{title}</h2>
                <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                  Fill in job details or upload a description file
                </p>
              </div>
            </div>
            {formExpanded ? (
              <ChevronUp style={{ width: "18px", height: "18px", color: "rgba(255,255,255,0.5)" }} />
            ) : (
              <ChevronDown style={{ width: "18px", height: "18px", color: "rgba(255,255,255,0.5)" }} />
            )}
          </div>

          {formExpanded && (
            <div style={{ padding: "24px" }}>
              {jobsError && (
                <div style={{ marginBottom: "16px" }}>
                  <ActionMessage type="error" message={jobsErrorMessage} />
                </div>
              )}

              {/* File upload zone */}
              <div
                style={{
                  border: "2px dashed #e5e7eb",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: uploadedFile ? "#f0fdf4" : "#fafafa",
                  borderColor: uploadedFile ? "#10b981" : "#e5e7eb",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: uploadedFile ? "#d1fae5" : "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText style={{ width: "18px", height: "18px", color: uploadedFile ? "#059669" : "#9ca3af" }} />
                </div>
                <div style={{ flex: 1 }}>
                  {uploadedFile ? (
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#065f46" }}>
                        {uploadedFile.name} loaded
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                        Description filled from file. Edit below as needed.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                        Upload job description file
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                        Supports .txt, .md — Gemini will use this alongside applicant profiles
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {uploadedFile && (
                    <button
                      type="button"
                      onClick={() => { setUploadedFile(null); setForm((p) => ({ ...p, description: "" })); }}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "1px solid #fecaca",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                      }}
                    >
                      <X style={{ width: "12px", height: "12px" }} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsingFile}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      background: "white",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    <Upload style={{ width: "12px", height: "12px" }} />
                    {isParsingFile ? "Loading…" : "Browse"}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.text"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>

              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  <FieldGroup label="Job Title" required>
                    <input
                      style={inputStyle}
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Senior Backend Engineer"
                      required
                      onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </FieldGroup>

                  <FieldGroup label="Location">
                    <div style={{ position: "relative" }}>
                      <MapPin
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "14px",
                          height: "14px",
                          color: "#9ca3af",
                        }}
                      />
                      <input
                        style={{ ...inputStyle, paddingLeft: "34px" }}
                        value={form.location}
                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="e.g. Kigali, Rwanda"
                        onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Employment Type">
                    <select
                      style={{ ...inputStyle, cursor: "pointer" }}
                      value={form.employmentType}
                      onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </FieldGroup>

                  <FieldGroup label="Min. Experience (years)">
                    <div style={{ position: "relative" }}>
                      <Clock
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "14px",
                          height: "14px",
                          color: "#9ca3af",
                        }}
                      />
                      <input
                        style={{ ...inputStyle, paddingLeft: "34px" }}
                        type="number"
                        min="0"
                        max="30"
                        value={experienceDraft}
                        onChange={(e) => setExperienceDraft(e.target.value)}
                        placeholder="e.g. 3"
                        onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Education Requirement">
                    <div style={{ position: "relative" }}>
                      <GraduationCap
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "14px",
                          height: "14px",
                          color: "#9ca3af",
                        }}
                      />
                      <input
                        style={{ ...inputStyle, paddingLeft: "34px" }}
                        value={form.education}
                        onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))}
                        placeholder="e.g. Bachelor's in Computer Science"
                        onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Required Skills (comma separated)">
                    <div style={{ position: "relative" }}>
                      <Code
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "14px",
                          height: "14px",
                          color: "#9ca3af",
                        }}
                      />
                      <input
                        style={{ ...inputStyle, paddingLeft: "34px" }}
                        value={skillDraft}
                        onChange={(e) => setSkillDraft(e.target.value)}
                        placeholder="Node.js, React, TypeScript"
                        onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </div>
                    {/* Skill preview pills */}
                    {skillDraft && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                        {splitCommaValues(skillDraft).map((s) => (
                          <span
                            key={s}
                            style={{
                              background: "#f0fdf4",
                              color: "#065f46",
                              border: "1px solid #d1fae5",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </FieldGroup>
                </div>

                <FieldGroup label="Job Description" required>
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: "140px",
                      resize: "vertical",
                      lineHeight: "1.6",
                    }}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the role, responsibilities, and requirements…&#10;&#10;This text — together with all applicant profiles — will be sent to Gemini for evaluation."
                    required
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                    Gemini reads the full description along with every candidate profile in a single evaluation pass.
                  </p>
                </FieldGroup>

                <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "11px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #059669, #047857)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: creating ? "not-allowed" : "pointer",
                      opacity: creating ? 0.7 : 1,
                    }}
                  >
                    <Plus style={{ width: "15px", height: "15px" }} />
                    {creating ? "Saving…" : editingId ? "Update Job" : "Create Job"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1.5px solid #e5e7eb",
                        background: "white",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                        color: "#374151",
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </section>

        {/* ── Job Listings ─────────────────────────────────── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: "0 0 3px", fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                Active Job Openings
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                {jobs?.length ?? 0} position{jobs?.length !== 1 ? "s" : ""} — used by Gemini as evaluation blueprint
              </p>
            </div>
          </div>

          {!jobs?.length ? (
            <div
              style={{
                borderRadius: "16px",
                border: "2px dashed #e5e7eb",
                background: "#fafafa",
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <Briefcase style={{ width: "36px", height: "36px", color: "#d1d5db", margin: "0 auto 12px" }} />
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#374151" }}>No jobs created yet</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                Create your first job opening above to enable AI screening.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {(jobs ?? []).map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  isSelected={selectedJobId === job._id}
                  onSelect={() => { setSelectedJobId(job._id); setJobPreviewOpen(true); }}
                  onEdit={() => {
                    setEditingId(job._id);
                    setSkillDraft(job.requiredSkills.join(", "));
                    setExperienceDraft(String(job.minimumExperience));
                    setForm({
                      title: job.title,
                      description: job.description,
                      requiredSkills: job.requiredSkills,
                      minimumExperience: job.minimumExperience,
                      education: job.education,
                      location: job.location,
                      employmentType: job.employmentType,
                    });
                    setFormExpanded(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onDelete={async () => {
                    try {
                      await deleteJob(job._id).unwrap();
                      setStatus({ type: "success", text: "Job deleted." });
                    } catch {
                      setStatus({ type: "error", text: "Failed to delete job." });
                    }
                  }}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <JobDetailPanel
        job={selectedJob}
        isOpen={jobPreviewOpen}
        onClose={() => setJobPreviewOpen(false)}
      />
    </>
  );
}