import { cn } from "@/components/ui/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

// This custom button keeps one visual language across the app without external UI kits.
export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variant === "primary" &&
          "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary",
        variant === "secondary" &&
          "border border-border bg-white text-black hover:bg-muted focus-visible:ring-primary",
        variant === "ghost" &&
          "bg-transparent text-black hover:bg-muted focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  );
}
