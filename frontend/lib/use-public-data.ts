"use client";

import { useState, useEffect } from "react";

/**
 * Hook to load JSON data from public/data/ at runtime.
 * Avoids Turbopack panics caused by large static JSON imports.
 */
export function usePublicData<T>(filename: string, fallback: T): { data: T; loading: boolean } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/data/${filename}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [filename]);

  return { data, loading };
}
