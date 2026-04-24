"use client";

import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage, splitCommaValues } from "@/lib/utils";
import {
  useBulkApplicantsMutation,
  useCreateApplicantMutation,
  useDeleteApplicantMutation,
  useGetApplicantsQuery,
  useUpdateApplicantMutation,
  useUploadResumesMutation,
} from "@/redux/services/api";
import { normalizeApplicantPayload, buildStructuredProfile } from "@/lib/normalize-applicant";
import { detectDuplicates, calculateDuplicateSimilarity, mergeApplicants } from "@/lib/duplicate-detection";
import { DataMigrationPanel } from "@/components/applicants/data-migration-panel";
import type { Applicant, StructuredProfile } from "@/lib/types";

/**
 * Render parsed data safely without escaping, preserving all values
 */
function renderParsedValue(value: unknown, maxDepth = 3, currentDepth = 0): React.ReactNode {
  if (currentDepth > maxDepth) return <span className="text-gray-500 text-xs">...</span>;

  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  if (typeof value === "string") {
    return <span className="text-gray-900 break-words">{value}</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-gray-900 font-mono">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[ empty ]</span>;
    return (
      <div className="space-y-1 ml-2 border-l-2 border-gray-200 pl-2">
        {value.map((item, idx) => (
          <div key={idx} className="text-sm">
            {renderParsedValue(item, maxDepth, currentDepth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return <span className="text-gray-400">&#123; empty &#125;</span>;
    return (
      <div className="space-y-1 ml-2 border-l-2 border-gray-200 pl-2 text-xs">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-semibold text-blue-600 flex-shrink-0">{key}:</span>
            <div className="flex-grow min-w-0">{renderParsedValue(val, maxDepth, currentDepth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-gray-500 text-xs">unknown</span>;
}

/**
 * Memoized table row component for better performance
 */
const ApplicantTableRow = React.memo(
  ({
    applicant,
    isSelected,
    onCheckboxChange,
    onRowClick,
    onEdit,
    onDelete,
  }: {
    applicant: Applicant;
    isSelected: boolean;
    onCheckboxChange: (id: string) => void;
    onRowClick: () => void;
    onEdit: (applicant: Applicant) => void;
    onDelete: (applicant: Applicant) => Promise<void>;
  }) => {
    const [deleting, setDeleting] = React.useState(false);
    const isDuplicate = applicant.isDuplicate;
    const rowClass = isDuplicate ? "bg-yellow-50 opacity-75" : "";

    const handleDelete = React.useCallback(async () => {
      try {
        setDeleting(true);
        await onDelete(applicant);
      } finally {
        setDeleting(false);
      }
    }, [applicant, onDelete]);

    return (
      <tr
        className={`border-b border-border cursor-pointer hover:bg-muted transition ${rowClass}`}
        onClick={onRowClick}
      >
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onCheckboxChange(applicant._id)}
            className="h-4 w-4 cursor-pointer"
          />
        </td>
        <td className="px-3 py-2 font-medium truncate">{applicant.fullName}</td>
        <td className="px-3 py-2 text-xs text-gray-600 truncate">{applicant.email}</td>
        <td className="px-3 py-2 text-center">
          <Badge variant="secondary">{applicant.yearsOfExperience}y</Badge>
        </td>
        <td className="px-3 py-2 text-xs truncate">
          {applicant.skills?.slice(0, 2).join(", ")}
          {applicant.skills && applicant.skills.length > 2 && ` +${applicant.skills.length - 2}`}
        </td>
        <td className="px-3 py-2">
          <Badge variant="primary">{applicant.source}</Badge>
        </td>
        <td className="px-3 py-2">
          {isDuplicate ? (
            <Badge variant="secondary">🔗 Duplicate</Badge>
          ) : applicant.structuredProfile ? (
            <Badge variant="secondary">✅ Structured</Badge>
          ) : (
            <Badge variant="secondary">⚠️ Basic</Badge>
          )}
        </td>
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(applicant)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "..." : "Delete"}
            </Button>
          </div>
        </td>
      </tr>
    );
  }
);

ApplicantTableRow.displayName = "ApplicantTableRow";

export default function ApplicantsPage() {
  const { data: applicants, error: applicantsError, refetch } = useGetApplicantsQuery();
  const [createApplicant] = useCreateApplicantMutation();
  const [updateApplicant] = useUpdateApplicantMutation();
  const [deleteApplicant] = useDeleteApplicantMutation();
  const [bulkApplicants, { isLoading: bulkLoading }] = useBulkApplicantsMutation();
  const [uploadResumes, { isLoading: uploadingResumes }] = useUploadResumesMutation();

  const [jsonValue, setJsonValue] = useState("");
  const [mode, setMode] = useState<"json" | "csv" | "excel" | "pdf">("json");
  const [jsonMode, setJsonMode] = useState<"single" | "batch">("single");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"overview" | "json">("overview");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mergingApplicants, setMergingApplicants] = useState(false);

  // Detect potential duplicates with memoization
  const duplicateGroups = useMemo(() => {
    return applicants ? detectDuplicates(applicants, 0.7) : new Map();
  }, [applicants]);

  const hasDuplicates = duplicateGroups.size > 0;

  // Memoize selected applicant to prevent unnecessary re-renders
  const selectedApplicant = useMemo(() => {
    return applicants?.find((entry) => entry._id === selectedApplicantId);
  }, [applicants, selectedApplicantId]);

  const onStructuredJsonSubmit = useCallback(async () => {
    try {
      if (!jsonValue.trim()) return;
      setStatus({ type: "info", text: "Parsing and saving profile(s)..." });
      
      let candidates: Record<string, unknown>[] = [];
      
      try {
        const parsed = JSON.parse(jsonValue);
        if (Array.isArray(parsed)) {
          candidates = parsed;
        } else {
          candidates = [parsed];
        }
      } catch (e) {
        throw new Error("Invalid JSON format. Please paste a valid JSON object or array of objects.");
      }

      if (candidates.length === 0) {
        setStatus({ type: "error", text: "No valid applicants found in JSON." });
        return;
      }

      if (editingId && candidates.length === 1) {
        const normalized = normalizeApplicantPayload(candidates[0]);
        await updateApplicant({
          id: editingId,
          data: {
            ...normalized,
            source: candidates[0].source || "json",
          },
        }).unwrap();
        setJsonValue("");
        setEditingId(null);
        setStatus({ type: "success", text: "Profile updated successfully." });
      } else if (candidates.length === 1) {
        const normalized = normalizeApplicantPayload(candidates[0]);
        await createApplicant({
          ...normalized,
          source: candidates[0].source || "json",
        }).unwrap();
        setJsonValue("");
        setStatus({ type: "success", text: "Profile saved successfully." });
      } else {
        const normalized = candidates.map((candidate) => {
          const norm = normalizeApplicantPayload(candidate);
          return {
            ...norm,
            source: (candidate.source as "json" | "csv" | "excel" | "pdf") || "json",
          };
        });
        await bulkApplicants({ applicants: normalized }).unwrap();
        setJsonValue("");
        setJsonMode("single");
        setStatus({ type: "success", text: `${candidates.length} profiles imported successfully.` });
      }
      
      await refetch();
    } catch (error) {
      setStatus({
        type: "error",
        text: getErrorMessage(error, "Invalid JSON or server error while saving profile."),
      });
    }
  }, [jsonValue, editingId, updateApplicant, createApplicant, bulkApplicants, refetch]);

  const normalizeRows = useCallback(
    (rows: Array<Record<string, string>>, source: "csv" | "excel") =>
      rows
        .filter((row) => Object.values(row).some((v) => v?.trim()))
        .map((row) => {
          const normalized = normalizeApplicantPayload({
            ...row,
            source,
          });
          return normalized;
        }),
    []
  );

  const onCsvUpload = useCallback(
    async (file: File) => {
      try {
        setStatus({ type: "info", text: "Processing CSV upload..." });
        const text = await file.text();
        const parsed = Papa.parse<Record<string, string>>(text, { header: true });
        const normalized = normalizeRows(parsed.data, "csv");
        await bulkApplicants({ applicants: normalized }).unwrap();
        setStatus({ type: "success", text: "CSV applicants uploaded and parsed successfully." });
        await refetch();
      } catch (error) {
        setStatus({ type: "error", text: getErrorMessage(error, "CSV upload failed. Please verify file structure.") });
      }
    },
    [normalizeRows, bulkApplicants, refetch]
  );

  const onExcelUpload = useCallback(
    async (file: File) => {
      try {
        setStatus({ type: "info", text: "Processing Excel upload..." });
        const wb = XLSX.read(await file.arrayBuffer());
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);
        const normalized = normalizeRows(rows, "excel");
        await bulkApplicants({ applicants: normalized }).unwrap();
        setStatus({ type: "success", text: "Excel applicants uploaded and parsed successfully." });
        await refetch();
      } catch (error) {
        setStatus({ type: "error", text: getErrorMessage(error, "Excel upload failed. Please verify file structure.") });
      }
    },
    [normalizeRows, bulkApplicants, refetch]
  );

  const handleCheckboxChange = useCallback((id: string) => {
    setSelectedCheckboxes((prev) => {
      const newChecked = new Set(prev);
      if (newChecked.has(id)) {
        newChecked.delete(id);
      } else {
        newChecked.add(id);
      }
      return newChecked;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCheckboxes((prev) => {
      if (prev.size === applicants?.length) {
        return new Set();
      } else {
        return new Set(applicants?.map((a) => a._id) || []);
      }
    });
  }, [applicants]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedCheckboxes.size === 0) return;
    try {
      setStatus({ type: "info", text: "Deleting selected applicants..." });
      for (const id of selectedCheckboxes) {
        await deleteApplicant(id).unwrap();
      }
      const count = selectedCheckboxes.size;
      setSelectedCheckboxes(new Set());
      setStatus({ type: "success", text: `Deleted ${count} applicants.` });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Batch delete failed.") });
    }
  }, [selectedCheckboxes, deleteApplicant, refetch]);

  const handleMergeDuplicates = useCallback(async () => {
    if (selectedCheckboxes.size < 2) {
      setStatus({ type: "error", text: "Please select at least 2 applicants to merge." });
      return;
    }

    try {
      setMergingApplicants(true);
      setStatus({ type: "info", text: "Merging duplicates..." });

      const selectedList = Array.from(selectedCheckboxes);
      const primary = applicants?.find((a) => a._id === selectedList[0]);
      if (!primary) throw new Error("Primary applicant not found");

      for (let i = 1; i < selectedList.length; i++) {
        const secondary = applicants?.find((a) => a._id === selectedList[i]);
        if (!secondary) continue;

        const merged = mergeApplicants(primary as Applicant, secondary as Applicant);
        await updateApplicant({
          id: primary._id,
          data: merged,
        }).unwrap();

        await updateApplicant({
          id: secondary._id,
          data: {
            ...secondary,
            isDuplicate: true,
            duplicateOf: primary._id,
          },
        }).unwrap();
      }

      setSelectedCheckboxes(new Set());
      setStatus({ type: "success", text: "Duplicates merged successfully." });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Merge failed.") });
    } finally {
      setMergingApplicants(false);
    }
  }, [selectedCheckboxes, applicants, updateApplicant, refetch]);

  return (
    <div className="space-y-6">
      {status && <ActionMessage type={status.type} message={status.text} />}
      {applicantsError && (
        <ActionMessage
          type="error"
          message="Could not load applicants. Set MONGODB_URI in .env.local and restart dev server."
        />
      )}

      {/* Data Migration Panel */}
      {applicants && applicants.length > 0 && (
        <DataMigrationPanel />
      )}

      {/* Input Section */}
      <section className="rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "json", label: "📋 Structured JSON" },
            { id: "csv", label: "📊 Upload CSV" },
            { id: "excel", label: "📈 Upload Excel" },
            { id: "pdf", label: "📄 Upload PDF Resumes" },
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
            <h2 className="text-lg font-semibold text-primary">📋 Structured Talent Profile (JSON)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Paste complete structured profile JSON following the canonical schema. Supports both single objects and arrays.
            </p>
            
            {/* Mode Toggle */}
            <div className="mt-3 flex gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">Import Mode:</span>
              <button
                onClick={() => setJsonMode("single")}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  jsonMode === "single"
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                👤 Single Profile
              </button>
              <button
                onClick={() => setJsonMode("batch")}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  jsonMode === "batch"
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                👥 Batch Import
              </button>
            </div>

            <textarea
              rows={12}
              className="mt-3 w-full rounded-lg border border-border bg-white p-3 text-sm font-mono text-gray-900 placeholder-gray-400"
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              placeholder={
                jsonMode === "batch"
                  ? `[
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "skills": [{"name": "TypeScript", "level": "Expert"}]
  },
  {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "skills": [{"name": "Python", "level": "Advanced"}]
  }
]`
                  : `{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "headline": "Senior Software Engineer",
  "skills": [
    { "name": "TypeScript", "level": "Expert", "yearsOfExperience": 5 },
    { "name": "React", "level": "Advanced" }
  ],
  "experience": [
    {
      "company": "Tech Corp",
      "role": "Senior Engineer",
      "startDate": "2020-01",
      "endDate": "Present",
      "technologies": ["TypeScript", "React"]
    }
  ]
}`
              }
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={onStructuredJsonSubmit}>
                {editingId ? "✏️ Update Profile" : jsonMode === "batch" ? "💾 Import Batch" : "💾 Save Profile"}
              </Button>
              {jsonMode === "batch" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(jsonValue);
                      const count = Array.isArray(parsed) ? parsed.length : 1;
                      setStatus({
                        type: "info",
                        text: `Valid JSON found: ${count} applicant(s) ready to import.`,
                      });
                    } catch (e) {
                      setStatus({ type: "error", text: "Invalid JSON format." });
                    }
                  }}
                >
                  ✓ Validate JSON
                </Button>
              )}
            </div>
          </article>
        )}

        {mode === "csv" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">📊 CSV Upload</h2>
            <p className="text-sm text-gray-600">
              Supports indexed columns (skills[0].name, experience[0].company) or flat structure
            </p>
            <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onCsvUpload(e.target.files[0])} />
          </article>
        )}

        {mode === "excel" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">📈 Excel Upload</h2>
            <p className="text-sm text-gray-600">
              Supports indexed columns (skills[0].name, experience[0].company) or flat structure
            </p>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && onExcelUpload(e.target.files[0])} />
          </article>
        )}

        {mode === "pdf" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">📄 PDF Resume Upload</h2>
            <p className="text-sm text-gray-600">Upload multiple PDFs for automatic parsing and extraction</p>
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
                  await refetch();
                } catch (error) {
                  setStatus({ type: "error", text: getErrorMessage(error, "Resume upload failed. Please try again.") });
                }
              }}
            />
          </article>
        )}

        {(bulkLoading || uploadingResumes) && <div className="skeleton-shimmer mt-3 h-10 w-full rounded-lg" />}
      </section>

      {/* Applicant Database Section */}
      <section className="rounded-xl border border-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black">👥 Applicant Database</h3>
            <p className="mt-1 text-sm text-gray-600">{applicants?.length || 0} total applicants</p>
          </div>
          <div className="flex gap-2">
            {hasDuplicates && (
              <Button
                variant={showDuplicates ? "primary" : "secondary"}
                onClick={() => setShowDuplicates(!showDuplicates)}
              >
                🔍 {duplicateGroups.size} Duplicates
              </Button>
            )}
            {selectedCheckboxes.size > 0 && (
              <>
                <Button variant="secondary" onClick={handleMergeDuplicates} disabled={mergingApplicants}>
                  🔗 Merge ({selectedCheckboxes.size})
                </Button>
                <Button variant="ghost" onClick={handleDeleteSelected}>
                  🗑️ Delete ({selectedCheckboxes.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Batch Selection Controls */}
        {applicants && applicants.length > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={selectedCheckboxes.size === applicants.length && applicants.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 cursor-pointer"
              title="Select all applicants"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedCheckboxes.size > 0 ? `${selectedCheckboxes.size} selected` : "Select all"}
            </span>
          </div>
        )}

        {/* Duplicates List */}
        {showDuplicates && duplicateGroups.size > 0 && (
          <div className="mb-4 space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="font-semibold text-yellow-900">⚠️ Potential Duplicates</h4>
            {Array.from(duplicateGroups.entries()).map(([primary, group]: [string, string[]]) => (
              <div key={primary} className="rounded border border-yellow-200 bg-white p-3 text-sm">
                <div className="space-y-2">
                  {group.map((id: string) => {
                    const app = applicants?.find((a) => a._id === id);
                    const primaryApp = applicants?.find((a) => a._id === primary);
                    const similarity: number =
                      id === primary
                        ? 1
                        : primaryApp && app
                            ? calculateDuplicateSimilarity(primaryApp, app)
                            : 0;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCheckboxes.has(id)}
                          onChange={() => handleCheckboxChange(id)}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-gray-500">{id.slice(0, 8)}</span>
                        <span className="font-medium">{app?.fullName}</span>
                        <Badge variant="secondary">{(similarity * 100).toFixed(0)}% match</Badge>
                        <span className="text-xs text-gray-600">{app?.email}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Applicants Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 w-12">
                  <input
                    type="checkbox"
                    checked={selectedCheckboxes.size === applicants?.length && applicants?.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Experience</th>
                <th className="px-3 py-2">Skills</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(applicants ?? []).map((applicant) => (
                <ApplicantTableRow
                  key={applicant._id}
                  applicant={applicant}
                  isSelected={selectedCheckboxes.has(applicant._id)}
                  onCheckboxChange={handleCheckboxChange}
                  onRowClick={() => {
                    setSelectedApplicantId(applicant._id);
                    setPreviewOpen(true);
                    setPreviewMode("overview");
                  }}
                  onEdit={(app) => {
                    setEditingId(app._id);
                    setMode("json");
                    const profile = app.structuredProfile || app;
                    setJsonValue(JSON.stringify(profile, null, 2));
                  }}
                  onDelete={async (app) => {
                    try {
                      await deleteApplicant(app._id).unwrap();
                      setStatus({ type: "success", text: "Applicant deleted successfully." });
                      await refetch();
                    } catch (error) {
                      setStatus({ type: "error", text: getErrorMessage(error, "Delete failed.") });
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
          {!applicants?.length && <p className="py-4 text-sm text-gray-600">No applicants yet.</p>}
        </div>
      </section>

      {/* Preview Panel */}
      {previewOpen && selectedApplicantId && (
        <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-auto border-l border-border bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">👤 Applicant Profile</h3>
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
              <Button
                variant="ghost"
                onClick={() => {
                  setPreviewOpen(false);
                  setSelectedApplicantId(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>

          {(() => {
            const selected = selectedApplicant;
            if (!selected) return null;

            const profile = (selected.structuredProfile || selected) as StructuredProfile;

            return (
              <div className="space-y-4">
                {previewMode === "overview" ? (
                  <>
                    {/* Basic Info */}
                    <div className="rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-primary mb-3">📋 Basic Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Full Name</p>
                          <p className="font-medium">{selected.fullName}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Email</p>
                          <p className="font-mono text-blue-600">{selected.email}</p>
                        </div>
                        {profile.firstName && (
                          <div>
                            <p className="text-gray-600">First Name</p>
                            <p className="font-medium">{profile.firstName}</p>
                          </div>
                        )}
                        {profile.lastName && (
                          <div>
                            <p className="text-gray-600">Last Name</p>
                            <p className="font-medium">{profile.lastName}</p>
                          </div>
                        )}
                        {selected.phone && (
                          <div>
                            <p className="text-gray-600">Phone</p>
                            <p className="font-medium">{selected.phone}</p>
                          </div>
                        )}
                        {profile.location && (
                          <div>
                            <p className="text-gray-600">Location</p>
                            <p className="font-medium">{profile.location}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-600">Years of Experience</p>
                          <p className="font-medium">{selected.yearsOfExperience} years</p>
                        </div>
                        {selected.education && (
                          <div className="col-span-2">
                            <p className="text-gray-600">Education</p>
                            <p className="font-medium text-xs whitespace-pre-wrap">{selected.education}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* All Parsed Raw Data Display */}
                    {selected.profileData && Object.keys(selected.profileData).length > 0 && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <h4 className="font-semibold text-emerald-900 mb-3">📊 Complete Parsed Data</h4>
                        <div className="space-y-3 text-sm max-h-96 overflow-y-auto">
                          {Object.entries(selected.profileData).map(([key, value]) => {
                            // Skip already displayed fields
                            if (
                              [
                                "fullName",
                                "email",
                                "phone",
                                "yearsOfExperience",
                                "education",
                                "firstName",
                                "lastName",
                                "location",
                              ].includes(key)
                            ) {
                              return null;
                            }

                            return (
                              <div
                                key={key}
                                className="p-3 bg-white rounded border border-emerald-100 hover:border-emerald-300 transition"
                              >
                                <div className="font-semibold text-emerald-700 mb-1">{key}</div>
                                <div className="text-gray-900 ml-2 border-l-2 border-emerald-200 pl-3">
                                  {renderParsedValue(value)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Headline & Bio */}
                    {(profile.headline || profile.bio || selected.summary || selected.resumeText) && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">💭 Professional Summary</h4>
                        {profile.headline && (
                          <div className="mb-2">
                            <p className="text-gray-600 text-sm">Headline</p>
                            <p className="font-medium">{profile.headline}</p>
                          </div>
                        )}
                        {profile.bio && (
                          <div className="mb-2">
                            <p className="text-gray-600 text-sm">Bio</p>
                            <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
                          </div>
                        )}
                        {selected.summary && !profile.bio && (
                          <div className="mb-2">
                            <p className="text-gray-600 text-sm">Summary</p>
                            <p className="text-sm whitespace-pre-wrap">{selected.summary}</p>
                          </div>
                        )}
                        {selected.resumeText && (
                          <div>
                            <p className="text-gray-600 text-sm">Resume Text</p>
                            <p className="text-xs whitespace-pre-wrap max-h-48 overflow-y-auto bg-gray-50 p-2 rounded border border-border">{selected.resumeText}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Flat Skills List (Parsed) */}
                    {selected.skills && Array.isArray(selected.skills) && selected.skills.length > 0 && (
                      <div className="rounded-lg border border-border p-4 bg-blue-50">
                        <h4 className="font-semibold text-primary mb-3">📌 Parsed Skills List</h4>
                        <div className="flex flex-wrap gap-2">
                          {selected.skills.map((skill: string, i: number) => (
                            <Badge key={i} variant="primary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured Skills */}
                    {profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">🛠️ Detailed Skills ({profile.skills.length})</h4>
                        <div className="space-y-2">
                          {profile.skills.map((skill: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{skill.name}</span>
                              <div className="flex gap-2">
                                {skill.level && <Badge variant="secondary">{skill.level}</Badge>}
                                {skill.yearsOfExperience && (
                                  <Badge variant="secondary">{skill.yearsOfExperience}y</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {profile.languages && Array.isArray(profile.languages) && profile.languages.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">🗣️ Languages ({profile.languages.length})</h4>
                        <div className="space-y-2">
                          {profile.languages.map((lang: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{lang.name}</span>
                              {lang.proficiency && <Badge variant="secondary">{lang.proficiency}</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">💼 Experience ({profile.experience.length})</h4>
                        <div className="space-y-3">
                          {profile.experience.map((exp: any, i: number) => (
                            <div key={i} className="border-l-4 border-primary pl-3 py-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">{exp.role}</p>
                                  <p className="text-sm text-gray-600">{exp.company}</p>
                                </div>
                                <div className="text-xs text-gray-600 whitespace-nowrap">
                                  {exp.startDate} → {exp.endDate}
                                </div>
                              </div>
                              {exp.description && <p className="text-sm mt-1">{exp.description}</p>}
                              {exp.technologies && exp.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {exp.technologies.map((tech: string, j: number) => (
                                    <Badge key={j} variant="secondary">
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {profile.education && Array.isArray(profile.education) && profile.education.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">🎓 Education ({profile.education.length})</h4>
                        <div className="space-y-3">
                          {profile.education.map((edu: any, i: number) => (
                            <div key={i} className="border-l-4 border-primary pl-3 py-1">
                              <div>
                                <p className="font-semibold">{edu.degree || edu.fieldOfStudy || "Education"}</p>
                                <p className="text-sm text-gray-600">{edu.institution || "Institution not provided"}</p>
                                {edu.fieldOfStudy && <p className="text-sm text-gray-600">Field: {edu.fieldOfStudy}</p>}
                                {(edu.startYear || edu.endYear) && (
                                  <p className="text-xs text-gray-600">
                                    {edu.startYear} - {edu.endYear || "Present"}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {profile.certifications && Array.isArray(profile.certifications) && profile.certifications.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">📜 Certifications ({profile.certifications.length})</h4>
                        <div className="space-y-2">
                          {profile.certifications.map((cert: any, i: number) => (
                            <div key={i} className="p-2 bg-gray-50 rounded">
                              <p className="font-medium">{cert.name}</p>
                              {cert.issuer && <p className="text-sm text-gray-600">by {cert.issuer}</p>}
                              {cert.issueDate && <p className="text-xs text-gray-600">{cert.issueDate}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {profile.projects && Array.isArray(profile.projects) && profile.projects.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">🚀 Projects ({profile.projects.length})</h4>
                        <div className="space-y-3">
                          {profile.projects.map((proj: any, i: number) => (
                            <div key={i} className="border-l-4 border-primary pl-3 py-1">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold">{proj.name}</p>
                                {proj.link && (
                                  <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                    Link ↗
                                  </a>
                                )}
                              </div>
                              {proj.description && <p className="text-sm mt-1">{proj.description}</p>}
                              {proj.role && <p className="text-sm text-gray-600">Role: {proj.role}</p>}
                              {proj.technologies && proj.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {proj.technologies.map((tech: string, j: number) => (
                                    <Badge key={j} variant="secondary">
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {(proj.startDate || proj.endDate) && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {proj.startDate} → {proj.endDate}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    {profile.availability && Object.keys(profile.availability).length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">📅 Availability</h4>
                        <div className="space-y-2 text-sm">
                          {profile.availability.status && (
                            <div>
                              <span className="text-gray-600">Status: </span>
                              <Badge variant="secondary">{profile.availability.status}</Badge>
                            </div>
                          )}
                          {profile.availability.type && (
                            <div>
                              <span className="text-gray-600">Employment Type: </span>
                              <Badge variant="secondary">{profile.availability.type}</Badge>
                            </div>
                          )}
                          {profile.availability.startDate && (
                            <div>
                              <span className="text-gray-600">Start Date: </span>
                              <span className="font-medium">{profile.availability.startDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Social Links */}
                    {profile.socialLinks && Object.values(profile.socialLinks).some((v) => v) && (
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-primary mb-3">🔗 Social Links</h4>
                        <div className="space-y-2 text-sm">
                          {profile.socialLinks.linkedin && (
                            <div>
                              <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                💼 LinkedIn
                              </a>
                            </div>
                          )}
                          {profile.socialLinks.github && (
                            <div>
                              <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                🐙 GitHub
                              </a>
                            </div>
                          )}
                          {profile.socialLinks.portfolio && (
                            <div>
                              <a href={profile.socialLinks.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                🌐 Portfolio
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Parsed Raw Data */}
                    {selected.profileData && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <h4 className="font-semibold text-amber-900 mb-3">📊 Parsed Data (Source)</h4>
                        <details className="cursor-pointer">
                          <summary className="text-sm font-medium text-amber-800 hover:text-amber-900">
                            View raw parsed data
                          </summary>
                          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-white p-3 text-xs font-mono text-gray-800 border border-amber-200">
                            {JSON.stringify(selected.profileData, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="rounded-lg border border-border p-4 bg-gray-50">
                      <h4 className="font-semibold text-primary mb-3">ℹ️ Profile Metadata</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Source</p>
                          <Badge variant="primary">{selected.source}</Badge>
                        </div>
                        <div>
                          <p className="text-gray-600">Status</p>
                          {selected.isDuplicate ? (
                            <Badge variant="secondary">Duplicate</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-600">Years of Experience</p>
                          <p className="font-medium">{selected.yearsOfExperience} years</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Skills Count</p>
                          <p className="font-medium">{selected.skills?.length || 0} skills</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Experience Entries</p>
                          <p className="font-medium">{profile.experience?.length || 0} positions</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Education Entries</p>
                          <p className="font-medium">{profile.education?.length || 0} institutions</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Created</p>
                          <p className="font-mono text-xs">{new Date(selected.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Updated</p>
                          <p className="font-mono text-xs">{new Date(selected.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <pre className="max-h-[700px] overflow-auto rounded-lg bg-gray-50 p-4 text-xs font-mono text-gray-800 border border-border">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                )}
              </div>
            );
          })()}
        </aside>
      )}

      {/* Applicant Detail Modal */}
    </div>
  );
}
