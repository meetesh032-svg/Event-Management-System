import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white p-10 sm:p-14 text-center shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="h-16 w-16 rounded-2xl bg-[#FFF0F3] border border-[#F84464]/20 flex items-center justify-center text-[#F84464] mb-4">
        {icon || <Sparkles className="h-8 w-8 text-[#F84464]" />}
      </div>
      <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
