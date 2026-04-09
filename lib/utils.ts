// This helper normalizes comma-separated values from forms/uploads into clean arrays.
// Keeping this in lib makes parsing behavior consistent across client and API boundaries.
export const splitCommaValues = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// Normalizes unknown runtime errors (including browser Event objects) into readable messages.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof (error as { data?: { message?: string } }).data?.message === "string"
  ) {
    return (error as { data?: { message?: string } }).data?.message || fallback;
  }
  if (error && typeof error === "object" && "type" in error) {
    return `Unexpected event error: ${(error as { type?: string }).type ?? "unknown"}`;
  }
  return fallback;
};

// Converts markdown content into plain readable text for profile ingestion previews.
export const markdownToPlainText = (markdown: string): string =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~>-]/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
