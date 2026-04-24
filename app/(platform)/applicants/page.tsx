"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
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
import { ApplicantDetailModal } from "@/components/applicants/applicant-detail-modal";
import type { Applicant, StructuredProfile } from "@/lib/types";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
  Link2,
  X,
  Trash2,
  Edit2,
  Eye,
  Users,
  ChevronDown,
  CheckSquare,
  GitMerge,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  CloudUpload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the best display name from an applicant record */
function resolveDisplayName(applicant: Applicant): string {
  // 1. Try full name if it's not a placeholder
  if (
    applicant.fullName &&
    applicant.fullName !== "Unknown Candidate" &&
    !applicant.fullName.toLowerCase().startsWith("unknown")
  ) {
    return applicant.fullName;
  }

  // 2. Try structured profile name
  const sp = applicant.structuredProfile as StructuredProfile | undefined;
  if (sp) {
    const first = sp.firstName?.trim() || "";
    const last = sp.lastName?.trim() || "";
    if (first || last) return `${first} ${last}`.trim();
  }

  // 3. Derive from email
  const emailLocal = (applicant.email || "").split("@")[0];
  if (emailLocal && !emailLocal.includes("unknown")) {
    return emailLocal
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return "—";
}

/** Resolve display email – hide auto-generated unknown.local emails */
function resolveDisplayEmail(applicant: Applicant): string {
  const sp = applicant.structuredProfile as StructuredProfile | undefined;

  // Prefer structured profile email if it's a real address
  if (sp?.email && !sp.email.endsWith("@unknown.local")) return sp.email;

  // Fall back to top-level email if real
  if (applicant.email && !applicant.email.endsWith("@unknown.local")) return applicant.email;

  return "—";
}

/** Get skills from structured profile (preferred) or flat array */
function resolveSkills(applicant: Applicant): string[] {
  const sp = applicant.structuredProfile as StructuredProfile | undefined;
  if (sp?.skills && sp.skills.length > 0) {
    return sp.skills.map((s) => s.name).filter(Boolean);
  }
  return applicant.skills || [];
}

// ---------------------------------------------------------------------------
// Upload Tab Types
// ---------------------------------------------------------------------------
type UploadMode = "json" | "csv" | "excel" | "pdf" | "url";

// ---------------------------------------------------------------------------
// Drag-and-Drop File Upload Zone
// ---------------------------------------------------------------------------
interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onFiles: (files: File[]) => void;
  loading?: boolean;
}

function DropZone({ accept, multiple, label, hint, icon, onFiles, loading }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => {
        const exts = accept.split(",").map((a) => a.trim().replace(".", "").toLowerCase());
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        return exts.includes(ext);
      });
      if (files.length) onFiles(files);
    },
    [accept, onFiles]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-3
        rounded-xl border-2 border-dashed p-10 cursor-pointer
        transition-all duration-200 select-none
        ${dragging
          ? "border-green-500 bg-green-50 scale-[1.01]"
          : "border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/50"
        }
        ${loading ? "opacity-60 pointer-events-none" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <div className={`p-4 rounded-full transition-colors ${dragging ? "bg-green-100" : "bg-white border border-gray-200"}`}>
        {loading ? (
          <RefreshCw className="w-7 h-7 text-green-600 animate-spin" />
        ) : (
          <div className="text-green-600">{icon}</div>
        )}
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800 text-sm">{loading ? "Processing..." : label}</p>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </div>
      {dragging && (
        <div className="absolute inset-0 rounded-xl bg-green-500/10 flex items-center justify-center">
          <p className="text-green-700 font-bold text-lg">Drop to upload</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applicant Card Row
// ---------------------------------------------------------------------------
const ApplicantRow = React.memo(
  ({
    applicant,
    isSelected,
    onCheckboxChange,
    onView,
    onEdit,
    onDelete,
  }: {
    applicant: Applicant;
    isSelected: boolean;
    onCheckboxChange: (id: string) => void;
    onView: () => void;
    onEdit: (applicant: Applicant) => void;
    onDelete: (applicant: Applicant) => Promise<void>;
  }) => {
    const [deleting, setDeleting] = useState(false);
    const isDuplicate = applicant.isDuplicate;
    const displayName = resolveDisplayName(applicant);
    const displayEmail = resolveDisplayEmail(applicant);
    const skills = resolveSkills(applicant);

    const sp = applicant.structuredProfile as StructuredProfile | undefined;
    const expCount = sp?.experience?.length ?? 0;
    const hasStructured = !!sp && Object.keys(sp).length > 0;

    const handleDelete = useCallback(async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        setDeleting(true);
        await onDelete(applicant);
      } finally {
        setDeleting(false);
      }
    }, [applicant, onDelete]);

    return (
      <div
        className={`
          group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer
          ${isDuplicate
            ? "border-yellow-200 bg-yellow-50/60 hover:bg-yellow-50"
            : "border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/30 hover:shadow-sm"
          }
          ${isSelected ? "border-green-300 bg-green-50/60 ring-1 ring-green-200" : ""}
        `}
        onClick={onView}
      >
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onCheckboxChange(applicant._id)}
            className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
          />
        </div>

        {/* Avatar */}
        <div className={`
          w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
          ${isDuplicate ? "bg-yellow-200 text-yellow-800" : "bg-black text-white"}
        `}>
          {displayName !== "—" ? displayName.charAt(0).toUpperCase() : "?"}
        </div>

        {/* Main Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm truncate">{displayName}</span>
            {isDuplicate && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Duplicate</span>
            )}
            {hasStructured && !isDuplicate && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Structured</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{displayEmail}</p>
        </div>

        {/* Skills */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0 max-w-[180px]">
          {skills.slice(0, 2).map((s, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full truncate max-w-[80px]">
              {s}
            </span>
          ))}
          {skills.length > 2 && (
            <span className="text-xs text-gray-400">+{skills.length - 2}</span>
          )}
        </div>

        {/* Experience */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-gray-400">{applicant.yearsOfExperience ?? 0}y exp</span>
          {expCount > 0 && <span className="text-xs text-gray-300">· {expCount} roles</span>}
        </div>

        {/* Source Badge */}
        <div className="hidden lg:block flex-shrink-0">
          <span className={`
            text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide
            ${applicant.source === "json" ? "bg-blue-50 text-blue-700"
              : applicant.source === "csv" ? "bg-purple-50 text-purple-700"
              : applicant.source === "excel" ? "bg-emerald-50 text-emerald-700"
              : "bg-orange-50 text-orange-700"}
          `}>
            {applicant.source}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(applicant); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
            title="Delete"
          >
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }
);
ApplicantRow.displayName = "ApplicantRow";

// ---------------------------------------------------------------------------
// Upload Mode Tab
// ---------------------------------------------------------------------------
const MODE_TABS: { id: UploadMode; label: string; icon: React.ReactNode }[] = [
  { id: "json",  label: "JSON",    icon: <FileJson className="w-4 h-4" /> },
  { id: "csv",   label: "CSV",     icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: "excel", label: "Excel",   icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: "pdf",   label: "PDF",     icon: <FileText className="w-4 h-4" /> },
  { id: "url",   label: "URL",     icon: <Link2 className="w-4 h-4" /> },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ApplicantsPage() {
  const { data: applicants, error: applicantsError, refetch, isLoading: applicantsLoading } = useGetApplicantsQuery();
  const [createApplicant] = useCreateApplicantMutation();
  const [updateApplicant] = useUpdateApplicantMutation();
  const [deleteApplicant] = useDeleteApplicantMutation();
  const [bulkApplicants, { isLoading: bulkLoading }] = useBulkApplicantsMutation();
  const [uploadResumes, { isLoading: uploadingResumes }] = useUploadResumesMutation();

  const [jsonValue, setJsonValue]       = useState("");
  const [jsonMode, setJsonMode]         = useState<"single" | "batch">("single");
  const [mode, setMode]                 = useState<UploadMode>("json");
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [urlInput, setUrlInput]         = useState("");
  const [urlLoading, setUrlLoading]     = useState(false);

  // Modal
  const [modalApplicant, setModalApplicant] = useState<Applicant | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);

  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mergingApplicants, setMergingApplicants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");

  // ---------------------------------------------------------------------------
  // Duplicate detection
  // ---------------------------------------------------------------------------
  const duplicateGroups = useMemo(
    () => (applicants ? detectDuplicates(applicants, 0.7) : new Map()),
    [applicants]
  );
  const hasDuplicates = duplicateGroups.size > 0;

  // ---------------------------------------------------------------------------
  // Filtered applicants
  // ---------------------------------------------------------------------------
  const filteredApplicants = useMemo(() => {
    let list = applicants ?? [];

    if (filterSource !== "all") {
      list = list.filter((a) => a.source === filterSource);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => {
        const name = resolveDisplayName(a).toLowerCase();
        const email = resolveDisplayEmail(a).toLowerCase();
        const skills = resolveSkills(a).join(" ").toLowerCase();
        return name.includes(q) || email.includes(q) || skills.includes(q);
      });
    }

    return list;
  }, [applicants, searchQuery, filterSource]);

  // ---------------------------------------------------------------------------
  // Submission handlers
  // ---------------------------------------------------------------------------
  const onStructuredJsonSubmit = useCallback(async () => {
    try {
      if (!jsonValue.trim()) return;
      setStatus({ type: "info", text: "Parsing and saving profile(s)..." });

      let candidates: Record<string, unknown>[] = [];
      try {
        const parsed = JSON.parse(jsonValue);
        candidates = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        throw new Error("Invalid JSON format. Please paste a valid JSON object or array of objects.");
      }

      if (!candidates.length) {
        setStatus({ type: "error", text: "No valid applicants found in JSON." });
        return;
      }

      if (editingId && candidates.length === 1) {
        const normalized = normalizeApplicantPayload(candidates[0]);
        await updateApplicant({ id: editingId, data: { ...normalized, source: candidates[0].source || "json" } }).unwrap();
        setJsonValue(""); setEditingId(null);
        setStatus({ type: "success", text: "Profile updated successfully." });
      } else if (candidates.length === 1) {
        const normalized = normalizeApplicantPayload(candidates[0]);
        await createApplicant({ ...normalized, source: candidates[0].source || "json" }).unwrap();
        setJsonValue("");
        setStatus({ type: "success", text: "Profile saved successfully." });
      } else {
        const normalized = candidates.map((c) => ({ ...normalizeApplicantPayload(c), source: (c.source as any) || "json" }));
        await bulkApplicants({ applicants: normalized }).unwrap();
        setJsonValue(""); setJsonMode("single");
        setStatus({ type: "success", text: `${candidates.length} profiles imported successfully.` });
      }

      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Invalid JSON or server error while saving profile.") });
    }
  }, [jsonValue, editingId, updateApplicant, createApplicant, bulkApplicants, refetch]);

  const normalizeRows = useCallback(
    (rows: Array<Record<string, string>>, source: "csv" | "excel") =>
      rows
        .filter((row) => Object.values(row).some((v) => v?.trim()))
        .map((row) => normalizeApplicantPayload({ ...row, source })),
    []
  );

  const onCsvFiles = useCallback(async (files: File[]) => {
    try {
      setStatus({ type: "info", text: "Processing CSV upload..." });
      const file = files[0];
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true });
      const normalized = normalizeRows(parsed.data, "csv");
      await bulkApplicants({ applicants: normalized }).unwrap();
      setStatus({ type: "success", text: `CSV imported: ${normalized.length} applicant(s).` });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "CSV upload failed.") });
    }
  }, [normalizeRows, bulkApplicants, refetch]);

  const onExcelFiles = useCallback(async (files: File[]) => {
    try {
      setStatus({ type: "info", text: "Processing Excel upload..." });
      const file = files[0];
      const wb = XLSX.read(await file.arrayBuffer());
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);
      const normalized = normalizeRows(rows, "excel");
      await bulkApplicants({ applicants: normalized }).unwrap();
      setStatus({ type: "success", text: `Excel imported: ${normalized.length} applicant(s).` });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Excel upload failed.") });
    }
  }, [normalizeRows, bulkApplicants, refetch]);

  const onPdfFiles = useCallback(async (files: File[]) => {
    try {
      setStatus({ type: "info", text: `Uploading ${files.length} PDF resume(s)...` });
      const form = new FormData();
      files.forEach((f) => form.append("resumes", f));
      await uploadResumes(form).unwrap();
      setStatus({ type: "success", text: `${files.length} PDF resume(s) uploaded.` });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "PDF upload failed.") });
    }
  }, [uploadResumes, refetch]);

  const onUrlImport = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) { setStatus({ type: "error", text: "Please enter a URL." }); return; }
    try {
      setUrlLoading(true);
      setStatus({ type: "info", text: "Fetching data from URL..." });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const raw = await res.json();
      const candidates: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
      const normalized = candidates.map((c) => ({ ...normalizeApplicantPayload(c), source: (c.source as any) || "json" }));
      await bulkApplicants({ applicants: normalized }).unwrap();
      setUrlInput("");
      setStatus({ type: "success", text: `URL import complete: ${normalized.length} applicant(s) imported.` });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "URL import failed. Ensure the URL returns valid JSON.") });
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, bulkApplicants, refetch]);

  // ---------------------------------------------------------------------------
  // Selection & bulk actions
  // ---------------------------------------------------------------------------
  const handleCheckboxChange = useCallback((id: string) => {
    setSelectedCheckboxes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCheckboxes((prev) =>
      prev.size === filteredApplicants.length
        ? new Set()
        : new Set(filteredApplicants.map((a) => a._id))
    );
  }, [filteredApplicants]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedCheckboxes.size) return;
    try {
      setStatus({ type: "info", text: "Deleting selected applicants..." });
      for (const id of selectedCheckboxes) await deleteApplicant(id).unwrap();
      const count = selectedCheckboxes.size;
      setSelectedCheckboxes(new Set());
      setStatus({ type: "success", text: `Deleted ${count} applicant(s).` });
      await refetch();
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Batch delete failed.") });
    }
  }, [selectedCheckboxes, deleteApplicant, refetch]);

  const handleMergeDuplicates = useCallback(async () => {
    if (selectedCheckboxes.size < 2) {
      setStatus({ type: "error", text: "Select at least 2 applicants to merge." });
      return;
    }
    try {
      setMergingApplicants(true);
      setStatus({ type: "info", text: "Merging duplicates..." });
      const ids = Array.from(selectedCheckboxes);
      const primary = applicants?.find((a) => a._id === ids[0]);
      if (!primary) throw new Error("Primary applicant not found");
      for (let i = 1; i < ids.length; i++) {
        const secondary = applicants?.find((a) => a._id === ids[i]);
        if (!secondary) continue;
        const merged = mergeApplicants(primary as Applicant, secondary as Applicant);
        await updateApplicant({ id: primary._id, data: merged }).unwrap();
        await updateApplicant({ id: secondary._id, data: { ...secondary, isDuplicate: true, duplicateOf: primary._id } }).unwrap();
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

  // ---------------------------------------------------------------------------
  // JSON editor placeholder text
  // ---------------------------------------------------------------------------
  const jsonPlaceholder =
    jsonMode === "batch"
      ? `[
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "skills": [{"name": "TypeScript", "level": "Expert", "yearsOfExperience": 5}]
  }
]`
      : `{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "headline": "Senior Software Engineer",
  "skills": [
    { "name": "TypeScript", "level": "Expert", "yearsOfExperience": 5 },
    { "name": "React", "level": "Advanced", "yearsOfExperience": 3 }
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
}`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 pb-16">

      {/* Status Banner */}
      {status && (
        <div className="sticky top-0 z-30 pt-4">
          <ActionMessage type={status.type} message={status.text} />
        </div>
      )}

      {applicantsError && (
        <ActionMessage
          type="error"
          message="Could not load applicants. Set MONGODB_URI in .env.local and restart dev server."
        />
      )}

      {/* Data Migration Panel */}
      {applicants && applicants.length > 0 && <DataMigrationPanel />}

      {/* ─── Upload Section ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg">
            <CloudUpload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Import Applicants</h2>
            <p className="text-xs text-gray-500">JSON · CSV · Excel · PDF · URL</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-gray-100 pb-0 overflow-x-auto">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium
                whitespace-nowrap transition-all duration-150 border-b-2 -mb-px
                ${mode === tab.id
                  ? "border-black text-black bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-6">
          {/* ── JSON Mode ── */}
          {mode === "json" && (
            <div className="space-y-4">
              {/* Single / Batch toggle */}
              <div className="flex gap-2">
                {(["single", "batch"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setJsonMode(m)}
                    className={`
                      px-4 py-1.5 rounded-full text-sm font-medium transition
                      ${jsonMode === m ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
                    `}
                  >
                    {m === "single" ? "Single Profile" : "Batch Import"}
                  </button>
                ))}
                {editingId && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                    <Edit2 className="w-3 h-3" />
                    Editing existing profile
                    <button
                      onClick={() => { setEditingId(null); setJsonValue(""); }}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <textarea
                rows={10}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 resize-y transition"
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                placeholder={jsonPlaceholder}
                spellCheck={false}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onStructuredJsonSubmit}
                  className="px-5 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-50"
                  disabled={!jsonValue.trim() || bulkLoading}
                >
                  {editingId ? "Update Profile" : jsonMode === "batch" ? "Import Batch" : "Save Profile"}
                </button>
                {jsonMode === "batch" && (
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonValue);
                        const count = Array.isArray(parsed) ? parsed.length : 1;
                        setStatus({ type: "info", text: `Valid JSON: ${count} applicant(s) ready.` });
                      } catch {
                        setStatus({ type: "error", text: "Invalid JSON format." });
                      }
                    }}
                    className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Validate JSON
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── CSV Mode ── */}
          {mode === "csv" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Supports flat or indexed columns like <code className="text-xs bg-gray-100 px-1 rounded">skills[0].name</code>, <code className="text-xs bg-gray-100 px-1 rounded">experience[0].company</code>
              </p>
              <DropZone
                accept=".csv"
                label="Drop your CSV file here or click to browse"
                hint="Comma-separated values with header row"
                icon={<FileSpreadsheet className="w-7 h-7" />}
                onFiles={onCsvFiles}
                loading={bulkLoading}
              />
            </div>
          )}

          {/* ── Excel Mode ── */}
          {mode === "excel" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Supports <code className="text-xs bg-gray-100 px-1 rounded">.xlsx</code> and <code className="text-xs bg-gray-100 px-1 rounded">.xls</code> files with applicant data rows.
              </p>
              <DropZone
                accept=".xlsx,.xls"
                label="Drop your Excel file here or click to browse"
                hint="First sheet will be processed"
                icon={<FileSpreadsheet className="w-7 h-7" />}
                onFiles={onExcelFiles}
                loading={bulkLoading}
              />
            </div>
          )}

          {/* ── PDF Mode ── */}
          {mode === "pdf" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Upload resume PDFs for automatic text extraction. Skill signals are inferred from resume content.
              </p>
              <DropZone
                accept=".pdf"
                multiple
                label="Drop PDF resumes here or click to browse"
                hint="Multiple files supported · Text extraction only"
                icon={<FileText className="w-7 h-7" />}
                onFiles={onPdfFiles}
                loading={uploadingResumes}
              />
            </div>
          )}

          {/* ── URL Mode ── */}
          {mode === "url" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Import applicant data from any URL that returns a JSON object or array. The response must match the applicant schema.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onUrlImport()}
                  placeholder="https://example.com/applicants.json"
                  className="flex-grow rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 transition"
                />
                <button
                  onClick={onUrlImport}
                  disabled={!urlInput.trim() || urlLoading}
                  className="px-5 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {urlLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Fetch & Import
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1 border border-gray-100">
                <p className="font-medium text-gray-700">Accepted response formats:</p>
                <p>• A single JSON object: <code className="bg-white px-1 rounded border border-gray-200">{"{ \"email\": \"...\", ... }"}</code></p>
                <p>• An array of objects: <code className="bg-white px-1 rounded border border-gray-200">{"[{ ... }, { ... }]"}</code></p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Applicant Database ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-grow">
              <div className="p-2 bg-black rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  Applicant Database
                  {applicants && (
                    <span className="ml-2 text-sm font-medium text-gray-400">
                      {filteredApplicants.length}
                      {filteredApplicants.length !== applicants.length && ` / ${applicants.length}`}
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {hasDuplicates && (
                <button
                  onClick={() => setShowDuplicates(!showDuplicates)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition
                    ${showDuplicates
                      ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                      : "border-gray-200 text-gray-600 hover:bg-yellow-50 hover:border-yellow-200"
                    }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {duplicateGroups.size} Duplicates
                </button>
              )}
              {selectedCheckboxes.size > 0 && (
                <>
                  <button
                    onClick={handleMergeDuplicates}
                    disabled={mergingApplicants || selectedCheckboxes.size < 2}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-black transition disabled:opacity-40"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    Merge ({selectedCheckboxes.size})
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete ({selectedCheckboxes.size})
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search + Filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email or skill…"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                </button>
              )}
            </div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/10 bg-white min-w-[130px]"
            >
              <option value="all">All Sources</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>

        {/* Duplicates alert panel */}
        {showDuplicates && duplicateGroups.size > 0 && (
          <div className="mx-6 mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Potential Duplicates Detected
            </p>
            {Array.from(duplicateGroups.entries()).map(([primary, group]) => (
              <div key={primary} className="rounded-lg bg-white border border-yellow-200 p-3 space-y-2">
                {group.map((id: string) => {
                  const app = applicants?.find((a) => a._id === id);
                  const primaryApp = applicants?.find((a) => a._id === primary);
                  const similarity = id === primary ? 1 : (primaryApp && app ? calculateDuplicateSimilarity(primaryApp, app) : 0);
                  if (!app) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm flex-wrap">
                      <input
                        type="checkbox"
                        checked={selectedCheckboxes.has(id)}
                        onChange={() => handleCheckboxChange(id)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="font-medium">{resolveDisplayName(app)}</span>
                      <span className="text-gray-500 text-xs">{resolveDisplayEmail(app)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${similarity >= 0.9 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {(similarity * 100).toFixed(0)}% match
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Select All bar (only when there are results) */}
        {filteredApplicants.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-50 bg-gray-50/50">
            <input
              type="checkbox"
              checked={selectedCheckboxes.size === filteredApplicants.length && filteredApplicants.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 accent-black cursor-pointer"
            />
            <span className="text-xs text-gray-500">
              {selectedCheckboxes.size > 0
                ? `${selectedCheckboxes.size} of ${filteredApplicants.length} selected`
                : `${filteredApplicants.length} applicant${filteredApplicants.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {/* Applicant List */}
        <div className="px-4 py-4 space-y-2">
          {applicantsLoading && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {!applicantsLoading && filteredApplicants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-600">
                {(applicants?.length ?? 0) === 0
                  ? "No applicants yet"
                  : "No results match your search"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {(applicants?.length ?? 0) === 0
                  ? "Import applicant data using the section above."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          )}

          {!applicantsLoading && filteredApplicants.map((applicant) => (
            <ApplicantRow
              key={applicant._id}
              applicant={applicant}
              isSelected={selectedCheckboxes.has(applicant._id)}
              onCheckboxChange={handleCheckboxChange}
              onView={() => {
                setModalApplicant(applicant);
                setModalOpen(true);
              }}
              onEdit={(app) => {
                setEditingId(app._id);
                setMode("json");
                const profile = app.structuredProfile || app;
                setJsonValue(JSON.stringify(profile, null, 2));
                // Scroll to top
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onDelete={async (app) => {
                try {
                  await deleteApplicant(app._id).unwrap();
                  setStatus({ type: "success", text: "Applicant deleted." });
                  if (modalApplicant?._id === app._id) setModalOpen(false);
                  await refetch();
                } catch (error) {
                  setStatus({ type: "error", text: getErrorMessage(error, "Delete failed.") });
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* ─── Applicant Detail Modal ─────────────────────────────────────────── */}
      <ApplicantDetailModal
        applicant={modalApplicant}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalApplicant(null); }}
      />
    </div>
  );
}