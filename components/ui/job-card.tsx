import { Job } from "@/lib/types";
import { Badge } from "./badge";
import { Button } from "./button";
import { MapPin, Briefcase, BookOpen, Zap } from "lucide-react";

interface JobCardProps {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
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
        {/* Header with title and employment type */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-primary leading-tight">{job.title}</h3>
            <Badge variant="secondary" className="mt-2">
              {job.employmentType}
            </Badge>
          </div>
          {isSelected && <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />}
        </div>

        {/* Quick info row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 py-3 border-y border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary/70 flex-shrink-0" />
            <span className="text-gray-700 truncate">{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary/70 flex-shrink-0" />
            <span className="text-gray-700">{job.minimumExperience}+ yrs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-primary/70 flex-shrink-0" />
            <span className="text-gray-700 truncate">{job.education}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-primary/70 flex-shrink-0" />
            <span className="text-gray-700">{job.requiredSkills.length} skills</span>
          </div>
        </div>

        {/* Description preview with smart truncation */}
        <div className={`mb-3 text-sm text-gray-700 transition-all duration-300 ${
          isExpanded ? "" : "line-clamp-2"
        }`}>
          <p className="leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>

        {/* Required skills badges */}
        <div className="mb-4 flex flex-wrap gap-2">
          {job.requiredSkills.slice(0, isExpanded ? undefined : 3).map((skill) => (
            <Badge key={skill} variant="primary" size="sm">
              {skill}
            </Badge>
          ))}
          {!isExpanded && job.requiredSkills.length > 3 && (
            <Badge variant="outline" size="sm">
              +{job.requiredSkills.length - 3} more
            </Badge>
          )}
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
