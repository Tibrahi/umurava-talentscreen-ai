import { Job } from "@/lib/types";
import { Badge } from "./badge";
import { Button } from "./button";
import { MapPin, Briefcase, BookOpen, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

interface JobCardProps {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

// Extract key points from job description
function extractKeyPoints(description: string): string[] {
  const keywordPatterns = [
    /(?:must|should|required|key|important|critical|essential)[\s:]*([^.!?\n]+)/gi,
    /(?:responsibilities?|duties?|tasks?|accountable for)[\s:]*([^.!?\n]+)/gi,
    /(?:qualifications?|requirements?|experience)[\s:]*([^.!?\n]+)/gi,
  ];

  const keyPoints = new Set<string>();
  keywordPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const point = match[1].trim();
      if (point.length > 10 && point.length < 150) {
        keyPoints.add(point);
      }
    }
  });

  return Array.from(keyPoints).slice(0, 3);
}

// Parse and format location
function formatLocation(location: string): { formatted: string; parts: string[] } {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const formatted = parts.join(", ");
  return { formatted, parts };
}

// Parse employment types (comma-separated)
function parseEmploymentTypes(employmentType: string): string[] {
  return employmentType
    .split(",")
    .map((type) => type.trim())
    .filter((type) => type.length > 0);
}

export function JobCard({
  job,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
}: JobCardProps) {
  const keyPoints = extractKeyPoints(job.description);
  const locationData = formatLocation(job.location);
  const employmentTypes = parseEmploymentTypes(job.employmentType);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
        isSelected
          ? "border-primary bg-gradient-to-br from-primary/5 via-white to-primary/10 shadow-lg"
          : "border-border bg-white hover:border-primary/50 hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      {/* Gradient overlay accent */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header with title */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-primary leading-tight">{job.title}</h3>
          </div>
          {isSelected && <div className="h-3 w-3 rounded-full bg-primary animate-pulse flex-shrink-0 mt-1" />}
        </div>

        {/* Minimal Info Row - Semicolon Separated */}
        <div className="mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-700">
            {/* Employment Types */}
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-medium">{employmentTypes.join("; ")}</span>
            </span>
            
            <span className="text-gray-400">|</span>
            
            {/* Location */}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium">{locationData.formatted}</span>
            </span>
            
            <span className="text-gray-400">|</span>
            
            {/* Education */}
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-medium">{job.education}</span>
            </span>
            
            <span className="text-gray-400">|</span>
            
            {/* Experience */}
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-red-600" />
              <span className="font-medium">{job.minimumExperience}+ yrs</span>
            </span>
          </div>
        </div>

        {/* Description preview - minimal */}
        <div className="mb-3">
          <p className={`text-sm text-gray-700 leading-relaxed transition-all duration-300 ${
            isExpanded ? "" : "line-clamp-2"
          }`}>
            {job.description}
          </p>
        </div>

        {/* Key Points Highlighting - minimal */}
        {keyPoints.length > 0 && (
          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-100">
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 mb-1">Key Points:</p>
                <p className="text-xs text-gray-700">
                  {keyPoints.map((point, idx) => (
                    <span key={idx}>
                      {idx > 0 && <span className="text-gray-400 mx-1.5">;</span>}
                      {point}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Required skills section - with semicolon separation */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-900 mb-2">Required Skills ({job.requiredSkills.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.slice(0, isExpanded ? undefined : 5).map((skill, idx) => (
              <span key={skill} className="inline-flex items-center text-xs">
                {idx > 0 && <span className="text-gray-400 mx-1">;</span>}
                <Badge variant="primary" size="sm" className="text-xs whitespace-nowrap">
                  {skill}
                </Badge>
              </span>
            ))}
            {!isExpanded && job.requiredSkills.length > 5 && (
              <span className="text-xs text-gray-600 font-medium align-middle">
                <span className="text-gray-400 mx-1">;</span>
                +{job.requiredSkills.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
