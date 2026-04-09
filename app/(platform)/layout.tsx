import { AppShell } from "@/components/layout/app-shell";

// Route-group layout wraps all main product pages in the recruiter dashboard shell.
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
