"use client";

// components/nav/BottomNav.tsx
//
// Persistent navigation across the app's five sections. Fixed to the bottom
// on mobile (thumb reach), shown as a simple top bar on wider screens.

import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home", icon: "\u2302" },
  { href: "/tasks", label: "Tasks", icon: "\u2713" },
  { href: "/food", label: "Food", icon: "\ud83c\udf7d" },
  { href: "/dashboard", label: "Fitness", icon: "\ud83d\udcaa" },
  { href: "/stats", label: "Stats", icon: "\ud83d\udcc8" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] flex justify-around py-2 px-1 md:sticky md:top-0 md:justify-start md:gap-1 md:border-t-0 md:border-b md:py-3 md:px-4"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors ${
              active
                ? "text-[#4C6EF5] bg-[#4C6EF5]/10 font-medium"
                : "text-[#6B7280] hover:bg-[#F1F2F4]"
            }`}
          >
            <span className="text-lg md:text-base" aria-hidden="true">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
