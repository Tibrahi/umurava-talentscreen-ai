"use client";

import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/ui/action-message";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/utils";
import {
  useBulkApplicantsMutation,
  useCreateApplicantMutation,
  useDeleteApplicantMutation,
  useGetApplicantsQuery,
  useUpdateApplicantMutation,
  useUploadResumesMutation,
} from "@/redux/services/api";
import { normalizeApplicantPayload } from "@/lib/normalize-applicant";
import { detectDuplicates, calculateDuplicateSimilarity, mergeApplicants } from "@/lib/duplicate-detection";
import { DataMigrationPanel } from "@/components/applicants/data-migration-panel";
import type { Applicant, StructuredProfile } from "@/lib/types";

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
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mergingApplicants, setMergingApplicants] = useState(false);

  const duplicateGroups = useMemo(() => {
    return applicants ? detectDuplicates(applicants, 0.7) : new Map();
  }, [applicants]);

  const hasDuplicates = duplicateGroups.size > 0;

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

      {applicants && applicants.length > 0 && <DataMigrationPanel />}

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
                  ? `[\n  {\n    "firstName": "Jane",\n    "lastName": "Doe",\n    "email": "jane@example.com",\n    "skills": [{"name": "TypeScript", "level": "Expert"}]\n  }\n]`
                  : `{\n  "firstName": "Jane",\n  "lastName": "Doe",\n  "email": "jane@example.com",\n  "headline": "Senior Software Engineer"\n}`
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
            <p className="text-sm text-gray-600">Supports indexed columns or flat structure</p>
            <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onCsvUpload(e.target.files[0])} />
          </article>
        )}

        {mode === "excel" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">📈 Excel Upload</h2>
            <p className="text-sm text-gray-600">Supports indexed columns or flat structure</p>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && onExcelUpload(e.target.files[0])} />
          </article>
        )}

        {mode === "pdf" && (
          <article className="mt-4 space-y-2">
            <h2 className="text-lg font-semibold text-primary">📄 PDF Resume Upload</h2>
            <p className="text-sm text-gray-600">Upload multiple PDFs for automatic parsing</p>
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
                  setStatus({ type: "error", text: getErrorMessage(error, "Resume upload failed.") });
                }
              }}
            />
          </article>
        )}

        {(bulkLoading || uploadingResumes) && <div className="skeleton-shimmer mt-3 h-10 w-full rounded-lg" />}
      </section>

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

        {applicants && applicants.length > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={selectedCheckboxes.size === applicants.length && applicants.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedCheckboxes.size > 0 ? `${selectedCheckboxes.size} selected` : "Select all"}
            </span>
          </div>
        )}

        {showDuplicates && duplicateGroups.size > 0 && (
          <div className="mb-4 space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="font-semibold text-yellow-900">⚠️ Potential Duplicates</h4>
            {Array.from(duplicateGroups.entries()).map(([primary, group]: [string, string[]]) => (
              <div key={primary} className="rounded border border-yellow-200 bg-white p-3 text-sm">
                <div className="space-y-2">
                  {group.map((id: string) => {
                    const app = applicants?.find((a) => a._id === id);
                    const primaryApp = applicants?.find((a) => a._id === primary);
                    const similarity = id === primary ? 1 : primaryApp && app ? calculateDuplicateSimilarity(primaryApp, app) : 0;
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

      {/* Preview Panel - Strictly Professional UI Only */}
      {previewOpen && selectedApplicantId && (
        <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-auto border-l border-gray-200 bg-white p-6 shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
            <h3 className="text-2xl font-bold text-black flex items-center gap-3">
              <span className="p-2 bg-black text-white rounded-lg">👤</span> Applicant Profile
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="text-gray-500 hover:text-black hover:bg-gray-100"
                onClick={() => {
                  setPreviewOpen(false);
                  setSelectedApplicantId(null);
                }}
              >
                Close View
              </Button>
            </div>
          </div>

          {(() => {
            const selected = selectedApplicant;
            if (!selected) return null;
            const profile = (selected.structuredProfile || selected) as StructuredProfile;

            return (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="rounded-2xl border border-gray-100 p-6 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Full Name</p>
                      <p className="font-bold text-lg text-black">{selected.fullName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Email</p>
                      <p className="font-medium text-green-600">{selected.email}</p>
                    </div>
                    {selected.phone && (
                      <div>
                        <p className="text-gray-500 mb-1">Phone</p>
                        <p className="font-semibold text-black">{selected.phone}</p>
                      </div>
                    )}
                    {profile.location && (
                      <div>
                        <p className="text-gray-500 mb-1">Location</p>
                        <p className="font-semibold text-black">{profile.location}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500 mb-1">Total Experience</p>
                      <Badge className="bg-black text-white">{selected.yearsOfExperience} years</Badge>
                    </div>
                  </div>
                </div>

                {/* Headline & Bio */}
                {(profile.headline || profile.bio || selected.summary) && (
                  <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
                    <h4 className="font-bold text-black text-lg mb-4">Professional Summary</h4>
                    {profile.headline && (
                      <div className="mb-4">
                        <p className="font-bold text-green-700 text-lg">{profile.headline}</p>
                      </div>
                    )}
                    {(profile.bio || selected.summary) && (
                      <p className="text-gray-600 leading-relaxed">
                        {profile.bio || selected.summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Experience Section */}
                {profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
                    <h4 className="font-bold text-black text-lg mb-6 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">💼</span> 
                      Experience ({profile.experience.length})
                    </h4>
                    <div className="space-y-6">
                      {profile.experience.map((exp: any, i: number) => (
                        <div key={i} className="pl-4 border-l-2 border-green-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-black text-base">{exp.role}</p>
                              <p className="text-green-700 font-medium">{exp.company}</p>
                            </div>
                            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                              {exp.startDate || "N/A"} → {exp.endDate || "Present"}
                            </Badge>
                          </div>
                          {exp.description && <p className="text-gray-600 mt-3 leading-relaxed text-sm">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education Section - Combined UI */}
                {profile.education && Array.isArray(profile.education) && profile.education.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
                    <h4 className="font-bold text-black text-lg mb-6 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">🎓</span> 
                      Education ({profile.education.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {profile.education.map((edu: any, i: number) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="font-bold text-black">{edu.degree || edu.fieldOfStudy || "Education"}</p>
                          <p className="text-green-700 font-medium mt-1">{edu.institution || "Institution not provided"}</p>
                          {edu.fieldOfStudy && <p className="text-sm text-gray-600 mt-2">Field: <span className="font-medium text-black">{edu.fieldOfStudy}</span></p>}
                          {(edu.startYear || edu.endYear) && (
                            <p className="text-xs font-semibold text-gray-400 mt-3 pt-3 border-t border-gray-200 uppercase tracking-wider">
                              Timeline: {edu.startYear || "N/A"} - {edu.endYear || "Present"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Skills Section */}
                {profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
                    <h4 className="font-bold text-black text-lg mb-6 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">🛠️</span> 
                      Technical Skills ({profile.skills.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {profile.skills.map((skill: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="font-bold text-black text-sm">{skill.name}</span>
                          {skill.level && <Badge className="bg-white border border-gray-200 text-green-700">{skill.level}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </aside>
      )}
    </div>
  );
}