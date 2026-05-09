"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useTenantId } from "@/contexts/AuthContext";

export default function TerminalRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const tenantId = useTenantId();
  const venueParam = searchParams.get("venue");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/login"); return; }
    // ?venue= overrides tenantId so dashboard's venue selection follows
    // through to the live page.
    const target = venueParam ?? tenantId;
    if (!target) { router.replace("/venues"); return; }
    router.replace(`/terminal/${target}`);
  }, [isLoaded, isSignedIn, tenantId, venueParam, router]);

  return <div className="page-loading"><div className="loading-spinner" /></div>;
}
