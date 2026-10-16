"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464] focus-visible:ring-offset-2";

    const variantStyles: Record<string, string> = {
      primary: "bg-[#F84464] hover:bg-[#E03252] text-white shadow-sm hover:shadow-md hover:shadow-[#F84464]/20",
      secondary: "bg-[#333545] hover:bg-[#222433] text-white shadow-sm hover:shadow-md",
      outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 shadow-sm",
      ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
      accent: "bg-[#FF8552] hover:bg-[#E67343] text-white shadow-sm hover:shadow-md hover:shadow-[#FF8552]/20",
    };

    const sizeStyles: Record<string, string> = {
      xs: "text-xs px-2.5 py-1 min-h-[32px] gap-1.5",
      sm: "text-xs px-3.5 py-1.5 min-h-[38px] gap-1.5",
      md: "text-sm px-5 py-2.5 min-h-[44px] gap-2",
      lg: "text-base px-6 py-3.5 min-h-[48px] gap-2.5",
    };

    const widthStyles = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
