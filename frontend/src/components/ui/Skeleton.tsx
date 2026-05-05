"use client";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "text" | "title" | "avatar" | "card";
}

export function Skeleton({ className = "", width, height, variant = "text" }: SkeletonProps) {
  const variantClass = `skeleton-${variant}`;
  
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div className={`skeleton ${variantClass} ${className}`} style={style} />
  );
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />;
}

export function SkeletonText({ width = "100%" }: { width?: string }) {
  return <div className="skeleton skeleton-text" style={{ width }} />;
}

export function SkeletonTitle() {
  return <div className="skeleton skeleton-title" />;
}