"use client";

import { useEffect } from "react";

export function CareGuidanceMarketplaceTracker() {
  useEffect(() => {
    const key = "fg-care-guidance-professionals-viewed";

    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, "1");

    async function track() {
      try {
        const response = await fetch(
          "/api/care-guidance/events",
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          sessionStorage.removeItem(key);
        }
      } catch (error) {
        sessionStorage.removeItem(key);

        console.error(
          "Errore tracking marketplace assistenza personalizzata:",
          error
        );
      }
    }

    void track();
  }, []);

  return null;
}
