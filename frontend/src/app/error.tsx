"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-boundary">
      <div className="error-boundary-content">
        <h2>Something went wrong</h2>
        <p>{error.message || "An unexpected error occurred"}</p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}