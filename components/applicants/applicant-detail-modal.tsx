"use client";

import React from "react";
import { X } from "lucide-react";
import { ApplicantDetailView } from "./applicant-detail-view";
import type { Applicant } from "@/lib/types";

interface ApplicantDetailModalProps {
  applicant: Applicant | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicantDetailModal({ applicant, isOpen, onClose }: ApplicantDetailModalProps) {
  if (!isOpen || !applicant) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center pt-6 pb-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Sticky close bar */}
        <div className="sticky top-0 z-10 flex justify-end p-3 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detail view body — onClose NOT passed so no second X button renders */}
        <div className="p-5 md:p-8 flex-1">
          <ApplicantDetailView applicant={applicant} />
        </div>
      </div>
    </div>
  );
}