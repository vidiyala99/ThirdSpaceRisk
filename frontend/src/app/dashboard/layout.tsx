import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="skeleton-grid">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}