import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "outline" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center font-medium rounded-full whitespace-nowrap transition-colors";
    
    const variantStyles = {
      primary: "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20",
      secondary: "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200",
      outline: "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50",
      success: "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
      warning: "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100",
      error: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    };

    const sizeStyles = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
      lg: "px-4 py-1.5 text-base",
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
