import { Job } from "@/lib/types";
import { Badge } from "./badge";
import { Button } from "./button";
import { X, Copy, Download } from "lucide-react";
import { useState } from "react";

interface JobDetailPanelProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailPanel({ job, isOpen, onClose }: JobDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !job) return null;

  const copyToClipboard = () => {
    const text = `
Job Title: ${job.title}
Employment Type: ${job.employmentType}
Location: ${job.location}
Experience: ${job.minimumExperience}+ years
Education: ${job.education}
Skills: ${job.requiredSkills.join(", ")}

Description:
${job.description}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseDescription = (description: string) => {
    type SectionType = "heading" | "paragraph" | "list";
    const sections: { type: SectionType; content: string[] }[] = [];
    const lines = description.split("\n").filter((line) => line.trim());

    let currentSection: { type: SectionType; content: string[] } = { type: "paragraph", content: [] };

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Detect heading (uppercase at start or ends with colon)
      const isHeading = /^[A-Z][A-Za-z\s]{3,}:?$/.test(trimmed) || /^\d+\.\s+[A-Z]/.test(trimmed);
      
      // Detect bullet point
      const isBullet = /^[-*•]\s+/.test(trimmed);

      if (isHeading) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        sections.push({
          type: "heading",
          content: [trimmed.replace(/:$/, "")],
        });
        currentSection = { type: "paragraph", content: [] };
      } else if (isBullet) {
        if (currentSection.type !== "list") {
          if (currentSection.content.length > 0) {
            sections.push(currentSection);
          }
          currentSection = { type: "list", content: [] };
        }
        currentSection.content.push(trimmed.replace(/^[-*•]\s+/, ""));
      } else {
        if (currentSection.type !== "paragraph" && currentSection.content.length > 0) {
          sections.push(currentSection);
          currentSection = { type: "paragraph", content: [] };
        }
        currentSection.content.push(trimmed);
      }
    });

    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  };

  const descriptionSections = parseDescription(job.description);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-2xl overflow-y-auto border-l-2 border-primary/20 bg-gradient-to-br from-white via-white to-primary/5 shadow-2xl animate-in slide-in-from-right-96">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 p-5 sm:p-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-primary">{job.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{job.employmentType}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 mb-1">EXPERIENCE</p>
              <p className="text-lg font-bold text-blue-900">{job.minimumExperience}+ years</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 border border-purple-100">
              <p className="text-xs font-semibold text-purple-600 mb-1">LOCATION</p>
              <p className="text-lg font-bold text-purple-900">{job.location}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 border border-green-100">
              <p className="text-xs font-semibold text-green-600 mb-1">EDUCATION</p>
              <p className="text-lg font-bold text-green-900">{job.education}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3 border border-orange-100">
              <p className="text-xs font-semibold text-orange-600 mb-1">REQUIRED SKILLS</p>
              <p className="text-lg font-bold text-orange-900">{job.requiredSkills.length}</p>
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
              <span className="inline-block h-5 w-1 bg-primary rounded-full" />
              Required Skills & Competencies
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((skill, index) => (
                <Badge
                  key={skill}
                  variant="primary"
                  className="animate-in fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Job Description - Structured */}
          <div>
            <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
              <span className="inline-block h-5 w-1 bg-primary rounded-full" />
              Job Description
            </h3>
            <div className="space-y-4">
              {descriptionSections.map((section, idx) => {
                if (section.type === "heading") {
                  return (
                    <div key={idx} className="mt-4 pt-2 border-t border-primary/20">
                      <h4 className="text-sm font-bold text-primary mb-2">
                        {section.content[0]}
                      </h4>
                    </div>
                  );
                } else if (section.type === "list") {
                  return (
                    <ul key={idx} className="space-y-2">
                      {section.content.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          className="flex gap-2 text-sm text-gray-700 items-start"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  );
                } else {
                  return (
                    <p key={idx} className="text-sm text-gray-700 leading-relaxed">
                      {section.content.join(" ")}
                    </p>
                  );
                }
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const element = document.createElement("a");
                const file = new Blob(
                  [
                    `Job Title: ${job.title}\nEmployment Type: ${job.employmentType}\nLocation: ${job.location}\nExperience: ${job.minimumExperience}+ years\nEducation: ${job.education}\nSkills: ${job.requiredSkills.join(", ")}\n\nDescription:\n${job.description}`,
                  ],
                  { type: "text/plain" }
                );
                element.href = URL.createObjectURL(file);
                element.download = `${job.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
