import { Shell } from "@/components/Shell";

/** Suspense fallback for route transitions. */
export default function Loading() {
  return (
    <Shell>
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </div>
    </Shell>
  );
}
