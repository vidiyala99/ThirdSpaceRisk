import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function UnderwriterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<SkeletonCard />}>{children}</Suspense>
    </AppShell>
  );
}
