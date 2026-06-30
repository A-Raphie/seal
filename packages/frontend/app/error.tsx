"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Next.js error boundary. Catches unexpected runtime errors in any route,
 * shows a friendly message (with the underlying error available for dev), and
 * offers a reset button. Announced to assistive tech via role="alert".
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would report to an error tracker.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center" role="alert">
      <h1 className="mb-2 text-2xl font-bold text-danger">Something went wrong</h1>
      <p className="mb-6 text-muted">
        An unexpected error occurred. You can try again, or return to the
        overview.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="mb-6 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-muted">
          {error.message}
        </pre>
      )}
      <div className="flex justify-center gap-3">
        <button className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
