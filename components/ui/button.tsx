import { cn } from "@/components/ui/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

// This custom button keeps one visual language across the app without external UI kits.
export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        sizeStyles[size],
        variant === "primary" &&
          "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary",
        variant === "secondary" &&
          "border border-border bg-white text-black hover:bg-muted focus-visible:ring-primary",
        variant === "outline" &&
          "border border-border bg-transparent text-black hover:bg-gray-50 focus-visible:ring-primary",
        variant === "ghost" &&
          "bg-transparent text-black hover:bg-muted focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  );
}
