"use client";

import { Sidebar } from "@/components/layout/sidebar";

// App shell controls the core recruiter dashboard layout: left navigation + right content.
// Keeping this shared wrapper avoids layout duplication and ensures UX consistency.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 bg-white">
        <div className="border-b border-border bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-black">Umurava TalentScreen AI</h1>
          <p className="text-sm text-gray-700">Production-grade AI recruitment screening workspace</p>
        </div>
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
