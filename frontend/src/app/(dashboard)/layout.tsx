"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="canvas-gradient flex min-h-screen items-center justify-center">
        <div className="glass-panel ambient-shadow flex flex-col items-center gap-4 rounded-2xl px-10 py-8 animate-fade-in">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="type-body text-on-surface-variant">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="canvas-gradient h-dvh overflow-hidden">
      <Sidebar />
      <main className="flex h-dvh flex-col lg:ml-72">
        {/* Mobile header — only visible below lg */}
        <header className="flex-none flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest/80 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="type-brand text-primary">
            Cognitive Architect
          </Link>
          <div className="pill-label rounded-full bg-surface-container px-3 py-1 text-on-surface-variant">
            Workspace
          </div>
        </header>
        {/* Page content — flex-1 so pages fill remaining space */}
        <div className="flex flex-1 flex-col min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
