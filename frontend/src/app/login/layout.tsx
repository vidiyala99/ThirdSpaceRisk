import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="login-layout">
      {children}
    </div>
  );
}