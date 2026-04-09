import { cn } from "@/components/ui/cn";

interface ActionMessageProps {
  type: "success" | "error" | "info";
  message: string;
}

// Reusable inline status banner used after user actions (save, upload, run screening).
// This keeps feedback consistent and clear across all pages.
export function ActionMessage({ type, message }: ActionMessageProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        type === "success" && "border-green-200 bg-green-50 text-green-800",
        type === "error" && "border-red-200 bg-red-50 text-red-800",
        type === "info" && "border-blue-200 bg-blue-50 text-blue-800"
      )}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
