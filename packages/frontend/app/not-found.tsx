import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">
          That route doesn&rsquo;t exist. Try one of the panes from the overview.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Back to overview
        </Link>
      </div>
    </Shell>
  );
}
