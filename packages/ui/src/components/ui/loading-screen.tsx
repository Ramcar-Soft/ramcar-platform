"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  timeout?: number;
  onRetry?: () => void;
  brand?: React.ReactNode;
}

export function LoadingScreen({
  timeout = 10000,
  onRetry,
  brand,
}: LoadingScreenProps) {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsTimedOut(true), timeout);
    return () => clearTimeout(timer);
  }, [timeout]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {brand && <div className="mb-8">{brand}</div>}

      {!isTimedOut ? (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Taking longer than expected...
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
