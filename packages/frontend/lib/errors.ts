/**
 * Maps a raw error message (typically a contract revert reason or a thrown
 * Error#message) to a friendly, user-facing string. Unknown errors collapse to
 * a generic message so we never leak internals or stack traces to the UI.
 *
 * Keep the keys in sync with the custom errors declared in ProofOfReserves.sol.
 */

const MAPPING: Record<string, string> = {
  EpochNotFound: "That epoch does not exist.",
  EpochNotOpen: "The attestation window for this epoch has closed.",
  EpochNotClosed: "The attestation window is still open — wait for it to close first.",
  NotRevealed: "The reveal has not been requested for this epoch yet.",
  NotFulfilled: "The public decryption result is not available yet.",
  AlreadyFulfilled: "This action has already been completed.",
  AlreadyChallenged: "A fraud challenge has already been filed for this customer.",
  AttestationAlreadyUsed: "This attestation has already been submitted.",
  InvalidSignature: "The exchange signature is invalid or does not match.",
  NotExchangeAdmin: "Connect the exchange admin wallet (the one set at deployment).",
  HandleMismatch: "The decryption handles did not match the on-chain state.",
  ZeroAddress: "An invalid (zero) address was supplied.",
};

/** Reason text is usually embedded as `reverted with reason string: "Foo()"`. */
function extractReason(raw: string): string | null {
  const m = raw.match(/reason string["'\s:]+([A-Za-z]\w*)\s*\(?/);
  if (m) return m[1];
  // Bare custom-error form: `Error: NotExchangeAdmin()` or just `NotExchangeAdmin()`.
  const bare = raw.match(/\b([A-Z]\w*)\(\)/);
  return bare ? bare[1] : null;
}

export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  const reason = extractReason(raw);
  if (reason && MAPPING[reason]) return MAPPING[reason];

  // Wallet/user-rejection patterns.
  if (/user rejected|denied transaction/i.test(raw)) {
    return "Transaction rejected in your wallet.";
  }
  if (/insufficient funds/i.test(raw)) {
    return "Your wallet doesn't have enough Sepolia ETH for this transaction.";
  }

  // Fall back to a generic message — never surface the raw internals.
  return "Something went wrong. Check your wallet and the contract state, then try again.";
}
