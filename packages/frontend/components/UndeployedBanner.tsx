import { AlertIcon } from "./icons";

/**
 * Shown on every pane when no contract is deployed yet (the zero-address
 * placeholder). Tells a visitor exactly why nothing works and what to do,
 * instead of letting reads fail silently against a non-existent contract.
 */
export function UndeployedBanner() {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3"
      role="alert"
    >
      <AlertIcon className="mt-0.5 shrink-0 text-xl text-warning" aria-hidden />
      <div className="text-sm">
        <p className="font-semibold text-warning">No contract deployed yet</p>
        <p className="mt-1 text-muted">
          This dApp reads from an on-chain contract, but none is configured. To
          deploy to Sepolia and seed demo data, run{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
            pnpm setup
          </code>{" "}
          from the repo root (see the README&rsquo;s &ldquo;Deploy&rdquo; section).
          The UI below will populate automatically once a contract is live.
        </p>
      </div>
    </div>
  );
}
