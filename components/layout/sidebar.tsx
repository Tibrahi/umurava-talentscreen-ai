"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleSidebar } from "@/redux/slices/ui-slice";
import { cn } from "@/components/ui/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", short: "D" },
  { href: "/jobs", label: "Jobs", short: "J" },
  { href: "/applicants", label: "Applicants", short: "A" },
  { href: "/screenings", label: "Screenings", short: "S" },
];

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarExpanded = useAppSelector((state) => state.ui.sidebarExpanded);

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen border-r border-[#274f9d] bg-primary text-white transition-all duration-300",
        sidebarExpanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#4f78c6] p-4">
          <div className={cn("font-bold tracking-tight", !sidebarExpanded && "hidden")}>
            Umurava AI
          </div>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-md border border-white/20 px-2 py-1 text-white hover:bg-white/10"
          >
            {sidebarExpanded ? "⇤" : "☰"}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
                  active ? "bg-white text-primary" : "text-white hover:bg-white/10"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
                    active ? "bg-primary text-white" : "bg-white/15 text-white"
                  )}
                >
                  {item.short}
                </span>
                {sidebarExpanded && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
