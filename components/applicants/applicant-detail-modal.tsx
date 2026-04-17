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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-start justify-center pt-8 pb-8">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal header with close button */}
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 md:p-8">
          <ApplicantDetailView applicant={applicant} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
