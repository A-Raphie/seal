/**
 * Safe integer parsing for form inputs. Returns `null` on anything that isn't a
 * non-negative base-10 integer, instead of throwing like `BigInt()` does.
 *
 * Used everywhere we previously wrote `BigInt(someUserInput)` — a non-numeric
 * value would otherwise throw and surface as a raw JS error in the UI.
 */
export function parseUint(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

/** True if `input` is a non-negative integer string (for live input validation). */
export function isValidUint(input: string): boolean {
  return /^\d+$/.test(input.trim());
}
