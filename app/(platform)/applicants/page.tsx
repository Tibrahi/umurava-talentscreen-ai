"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { getErrorMessage, splitCommaValues } from "@/lib/utils";
import {
  useBulkApplicantsMutation,
  useCreateApplicantMutation,
  useDeleteApplicantMutation,
  useGetApplicantsQuery,
  useUpdateApplicantMutation,
  useUploadResumesMutation,
} from "@/redux/services/api";

export default function ApplicantsPage() {
  const { data: applicants, error: applicantsError } = useGetApplicantsQuery();
  const [createApplicant] = useCreateApplicantMutation();
  const [updateApplicant] = useUpdateApplicantMutation();
  const [deleteApplicant] = useDeleteApplicantMutation();
  const [bulkApplicants, { isLoading: bulkLoading }] = useBulkApplicantsMutation();
  const [uploadResumes, { isLoading: uploadingResumes }] = useUploadResumesMutation();
  const [jsonValue, setJsonValue] = useState("");
  const [mode, setMode] = useState<"json" | "csv" | "excel" | "pdf">("json");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"overview" | "json">("overview");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );

  const onStructuredJsonSubmit = async () => {
    try {
      if (!jsonValue.trim()) return;
      setStatus({ type: "info", text: "Saving structured profile..." });
      const candidate = JSON.parse(jsonValue) as Record<string, unknown>;
      const payload = { ...candidate, source: "json" };
      if (editingId) {
        await updateApplicant({
          id: editingId,
          data: payload,
        }).unwrap();
      } else {
        await createApplicant(payload).unwrap();
      }
      setJsonValue("");
      setEditingId(null);
      setStatus({ type: "success", text: "Structured profile saved successfully." });
    } catch (error) {
      setStatus({
        type: "error",
        text: getErrorMessage(error, "Invalid JSON or server error while saving profile."),
      });
    }
  };

  const normalizeRows = (rows: Array<Record<string, string>>, source: "csv" | "excel") =>
    rows.map((row) => ({
      fullName: row.fullName || row.name || "Unknown Candidate",
      email: row.email || `${(row.fullName || row.name || "unknown").toLowerCase().replaceAll(" ", ".")}@unknown.local`,
      phone: row.phone || "",
      yearsOfExperience: Number(row.yearsOfExperience || row.experience || 0),
      education: row.education || "Not provided",
      skills: splitCommaValues(row.skills || ""),
      summary: row.summary || "",
      source,
    }));

  const onCsvUpload = async (file: File) => {
    try {
      setStatus({ type: "info", text: "Processing CSV upload..." });
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true });
      await bulkApplicants({ applicants: normalizeRows(parsed.data, "csv") }).unwrap();
      setStatus({ type: "success", text: "CSV applicants uploaded successfully." });
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "CSV upload failed. Please verify file structure.") });
    }
  };

  const onExcelUpload = async (file: File) => {
    try {
      setStatus({ type: "info", text: "Processing Excel upload..." });
      const wb = XLSX.read(await file.arrayBuffer());
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);
      await bulkApplicants({ applicants: normalizeRows(rows, "excel") }).unwrap();
      setStatus({ type: "success", text: "Excel applicants uploaded successfully." });
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Excel upload failed. Please verify file structure.") });
    }
  };

  return (
    <div className="space-y-6">
      {status && <ActionMessage type={status.type} message={status.text} />}
      {applicantsError && (
        <ActionMessage
          type="error"
          message="Could not load applicants. Set MONGODB_URI in .env.local and restart dev server."
        />
      )}
      <section className="rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "json", label: "Structured JSON" },
            { id: "csv", label: "Upload CSV" },
            { id: "excel", label: "Upload Excel" },
            { id: "pdf", label: "Upload PDF Resumes" },
          ].map((item) => (
            <Button
              key={item.id}
              variant={mode === item.id ? "primary" : "secondary"}
              onClick={() => setMode(item.id as typeof mode)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {mode === "json" && (
          <article className="mt-4">
          <h2 className="text-lg font-semibold text-primary">Structured Talent Profile (JSON)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste complete structured profile JSON (arrays and nested fields are preserved).
          </p>
          <textarea
            rows={10}
            className="mt-3 w-full rounded-lg border border-border p-3 text-sm"
            value={jsonValue}
            onChange={(event) => setJsonValue(event.target.value)}
            placeholder='{"fullName":"Alice Doe","email":"alice@company.com","yearsOfExperience":5,"education":"BSc CS","skills":["TypeScript"],"summary":"..."}'
          />
          <Button className="mt-3" onClick={onStructuredJsonSubmit}>
            {editingId ? "Update Structured Profile" : "Save Structured Profile"}
          </Button>
          </article>
        )}

        {mode === "csv" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">CSV Upload</h2>
            <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onCsvUpload(e.target.files[0])} />
          </article>
        )}

        {mode === "excel" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">Excel Upload</h2>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && onExcelUpload(e.target.files[0])} />
          </article>
        )}

        {mode === "pdf" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">PDF Resume Upload</h2>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={async (e) => {
                if (!e.target.files?.length) return;
                try {
                  setStatus({ type: "info", text: "Uploading and parsing resume PDFs..." });
                  const form = new FormData();
                  Array.from(e.target.files).forEach((file) => form.append("resumes", file));
                  await uploadResumes(form).unwrap();
                  setStatus({ type: "success", text: "Resume PDFs uploaded successfully." });
                } catch (error) {
                  setStatus({ type: "error", text: getErrorMessage(error, "Resume upload failed. Please try again.") });
                }
              }}
            />
          </article>
        )}

        {(bulkLoading || uploadingResumes) && <div className="skeleton-shimmer mt-3 h-10 w-full rounded-lg" />}
      </section>

      <section className="rounded-xl border border-border bg-white p-5">
        <h3 className="text-lg font-semibold text-black">Applicant Database</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Experience</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(applicants ?? []).map((applicant) => (
                <tr
                  key={applicant._id}
                  className="border-b border-border cursor-pointer hover:bg-muted"
                  onClick={() => {
                    setSelectedApplicantId(applicant._id);
                    setPreviewMode("overview");
                    setPreviewOpen(true);
                  }}
                >
                  <td className="px-3 py-2">{applicant.fullName}</td>
                  <td className="px-3 py-2">{applicant.email}</td>
                  <td className="px-3 py-2">{applicant.yearsOfExperience}y</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-primary px-2 py-1 text-xs text-white">
                      {applicant.source}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingId(applicant._id);
                          setMode("json");
                          setJsonValue(
                            JSON.stringify(
                              (applicant as unknown as { profileData?: { raw?: unknown } })
                                .profileData?.raw ?? applicant,
                              null,
                              2
                            )
                          );
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async (event) => {
                          event.stopPropagation();
                          try {
                            await deleteApplicant(applicant._id).unwrap();
                            setStatus({ type: "success", text: "Applicant deleted successfully." });
                          } catch (error) {
                            setStatus({ type: "error", text: getErrorMessage(error, "Delete failed.") });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!applicants?.length && <p className="py-4 text-sm text-gray-600">No applicants yet.</p>}
        </div>
      </section>

      {previewOpen && (
        <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-auto border-l border-border bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Applicant Detail Preview</h3>
            <div className="flex gap-2">
              <Button
                variant={previewMode === "overview" ? "primary" : "secondary"}
                onClick={() => setPreviewMode("overview")}
              >
                Overview
              </Button>
              <Button
                variant={previewMode === "json" ? "primary" : "secondary"}
                onClick={() => setPreviewMode("json")}
              >
                JSON
              </Button>
              <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          {selectedApplicantId && (
            <div className="mt-4 space-y-4">
              {(() => {
                const selected = applicants?.find((entry) => entry._id === selectedApplicantId);
                const profile = (selected as unknown as { profileData?: Record<string, unknown> })
                  ?.profileData;
                const profileRaw = profile?.raw as Record<string, unknown> | undefined;
                return (
                  <>
                    {previewMode === "overview" ? (
                      <div className="rounded-lg border border-border p-3 text-sm">
                        <p className="font-semibold text-primary">Overview</p>
                        <p className="mt-2"><strong>Name:</strong> {selected?.fullName}</p>
                        <p><strong>Email:</strong> {selected?.email}</p>
                        <p><strong>Experience:</strong> {selected?.yearsOfExperience} years</p>
                        <p><strong>Education:</strong> {selected?.education}</p>
                        <p><strong>Skills:</strong> {selected?.skills?.join(", ") || "N/A"}</p>
                        <p><strong>Headline:</strong> {String(profile?.headline ?? "N/A")}</p>
                        <p><strong>Bio:</strong> {String(profile?.bio ?? "N/A")}</p>
                        <p><strong>Location:</strong> {String(profile?.location ?? "N/A")}</p>
                        <p><strong>Source:</strong> {selected?.source}</p>
                        <p><strong>Languages Count:</strong> {Array.isArray(profile?.languages) ? profile.languages.length : 0}</p>
                        <p><strong>Experience Items:</strong> {Array.isArray(profile?.experience) ? profile.experience.length : 0}</p>
                        <p><strong>Education Items:</strong> {Array.isArray(profile?.education) ? profile.education.length : 0}</p>
                        <p><strong>Certifications:</strong> {Array.isArray(profile?.certifications) ? profile.certifications.length : 0}</p>
                        <p><strong>Projects:</strong> {Array.isArray(profile?.projects) ? profile.projects.length : 0}</p>
                        <p><strong>Availability:</strong> {JSON.stringify(profile?.availability ?? {})}</p>
                        <p><strong>Social Links:</strong> {JSON.stringify(profile?.socialLinks ?? {})}</p>
                      </div>
                    ) : (
                      <pre className="max-h-[620px] overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                        {JSON.stringify(profileRaw ?? selected ?? {}, null, 2)}
                      </pre>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
