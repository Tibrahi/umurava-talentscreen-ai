"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleSidebar } from "@/redux/slices/ui-slice";
import { cn } from "@/components/ui/cn";
import { X } from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  short: "D", emoji: "📊" },
  { href: "/jobs",       label: "Jobs",        short: "J", emoji: "💼" },
  { href: "/applicants", label: "Applicants",  short: "A", emoji: "👥" },
  { href: "/screenings", label: "Screenings",  short: "S", emoji: "🤖" },
];

interface SidebarProps {
  /** Mobile overlay open state — controlled by AppShell */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname        = usePathname();
  const dispatch        = useAppDispatch();
  const sidebarExpanded = useAppSelector((state) => state.ui.sidebarExpanded);

  const NavContent = () => (
    <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-150",
              active
                ? "bg-white text-primary shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <span
              className={cn(
                "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all",
                active ? "bg-primary text-white shadow-sm" : "bg-white/15 text-white"
              )}
            >
              {item.short}
            </span>
            {/* Label: always visible on mobile overlay, controlled by Redux on desktop */}
            <span className={cn(
              "truncate transition-all duration-200",
              "block md:hidden lg:block",              // always on mobile overlay & large; hide icon-only on md
              !sidebarExpanded && "md:hidden"          // respect desktop collapsed state
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  // ── Mobile overlay ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-primary text-white flex flex-col shadow-2xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">U</div>
            <span className="font-bold tracking-tight text-white">Umurava AI</span>
          </div>
          <button
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden md:flex h-screen flex-col border-r border-[#274f9d] bg-primary text-white transition-all duration-300",
          sidebarExpanded ? "w-60" : "w-[72px]"
        )}
      >
        {/* Desktop header */}
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <div className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-200",
            sidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
          )}>
            <div className="h-7 w-7 flex-shrink-0 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">U</div>
            <span className="font-bold tracking-tight text-white whitespace-nowrap text-sm">Umurava AI</span>
          </div>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => dispatch(toggleSidebar())}
            className="flex-shrink-0 rounded-lg border border-white/20 p-1.5 text-white hover:bg-white/10 transition"
          >
            <span className="text-xs leading-none">{sidebarExpanded ? "⇤" : "☰"}</span>
          </button>
        </div>
        <NavContent />
      </aside>
    </>
  );
}