"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useTenantId } from "@/contexts/AuthContext";

export default function TerminalRedirect() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const tenantId = useTenantId();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/login"); return; }
    // Brokers without a tenantId go to the first known venue as a fallback
    router.replace(`/terminal/${tenantId ?? "elsewhere-brooklyn"}`);
  }, [isLoaded, isSignedIn, tenantId, router]);

  return <div className="page-loading"><div className="loading-spinner" /></div>;
}
