import { useState, useEffect } from "react";
import type { AudienceType } from "@/components/landing/AudienceToggle";

const STORAGE_KEY = "llumos-audience-preference";

export function useAudienceToggle() {
  const [audience, setAudience] = useState<AudienceType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "marketing" || stored === "agency") {
        return stored;
      }
    }
    return "marketing";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, audience);
  }, [audience]);

  return [audience, setAudience] as const;
}
