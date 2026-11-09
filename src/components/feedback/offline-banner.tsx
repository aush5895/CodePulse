"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/use-network-status";

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const reduceMotion = useReducedMotion();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (isOnline && wasOffline.current) {
      toast.success("Connection restored!");
    }
    wasOffline.current = !isOnline;
  }, [isOnline]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4 pt-2"
    >
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse"
            />
            <span>You’re offline. You can still view previously loaded data.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
