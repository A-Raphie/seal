import { friendlyError } from "@/lib/errors";

/**
 * Friendly, accessible error message. Maps raw contract/wallet errors via
 * `friendlyError` and announces them to assistive tech via `role="alert"`.
 */
export function ErrorText({ error }: { error: string | Error | null }) {
  if (!error) return null;
  const message = friendlyError(error);
  return (
    <p className="text-xs text-danger" role="alert">
      {message}
    </p>
  );
}
