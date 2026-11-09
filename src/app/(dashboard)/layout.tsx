"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/animations/page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfflineBanner } from "@/components/feedback/offline-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <motion.div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-out",
          !isMobile && "ml-[256px]"
        )}
      >
        {/* Topbar */}
        <Topbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Page content */}
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </motion.div>

      <OfflineBanner />

      {/* Command Palette (global overlay) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
}
