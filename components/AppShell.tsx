"use client";

// components/AppShell.tsx

import { useAuth } from "@/lib/useAuth";
import LoginForm from "@/components/auth/LoginForm";
import BottomNav from "@/components/nav/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center text-[#6B7280] text-sm">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="hidden md:block">
        <BottomNav />
      </div>
      <div className="pb-20 md:pb-8">{children}</div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
