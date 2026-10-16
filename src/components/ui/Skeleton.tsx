import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "rounded";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = "",
  variant = "rounded",
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rectangular: "rounded-none",
    circular: "rounded-full",
    rounded: "rounded-xl",
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantStyles[variant]} ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-0 overflow-hidden shadow-sm">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
