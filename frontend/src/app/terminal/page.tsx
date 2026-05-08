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
    // No tenant assigned — send the user to /venues to pick or set one up,
    // rather than dropping them into someone else's venue.
    if (!tenantId) { router.replace("/venues"); return; }
    router.replace(`/terminal/${tenantId}`);
  }, [isLoaded, isSignedIn, tenantId, router]);

  return <div className="page-loading"><div className="loading-spinner" /></div>;
}
