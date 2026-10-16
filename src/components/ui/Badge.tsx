import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  children,
  className = "",
  variant = "default",
  size = "md",
  dot = false,
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center font-bold rounded-full transition-colors select-none";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const variantStyles = {
    default: "bg-gray-100 text-gray-700",
    primary: "bg-[#FFF0F3] text-[#F84464] border border-[#F84464]/20",
    secondary: "bg-[#333545] text-white",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    outline: "border border-gray-300 text-gray-700 bg-white",
  };

  const dotColors = {
    default: "bg-gray-400",
    primary: "bg-[#F84464]",
    secondary: "bg-gray-200",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-500",
    outline: "bg-gray-500",
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props}>
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
