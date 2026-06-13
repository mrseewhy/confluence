/**
 * Safe utilities for extracting typed data from Supabase query results.
 * Replaces dangerous `as` type assertions with runtime-safe accessors.
 */

/** Extract a string value safely from an unknown object */
export function safeStr(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return fallback;
}

/** Extract a number safely from an unknown object */
export function safeNum(val: unknown, fallback = 0): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Extract a boolean safely from an unknown object */
export function safeBool(val: unknown, fallback = false): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  return fallback;
}

/** Extract a nullable string safely */
export function safeStrNull(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  return safeStr(val, null as unknown as string) || null;
}

/** Ensure the value is an array (empty array fallback) */
export function safeArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  return [];
}

/** Extract a Date string safely */
export function safeDate(val: unknown, fallback = ""): string {
  const s = safeStr(val);
  return s || fallback;
}

/**
 * Parse a Supabase joined-relation result.
 * Supabase returns joined fields as either a single object or array with one element.
 */
export function safeJoin<T>(val: unknown): T | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    return (val.length > 0 ? val[0] : null) as T | null;
  }
  return val as T;
}

/**
 * Safe wrapper around supabase `.select()` data.
 * Returns the data as an array (or empty array) with proper typing.
 */
export function safeData<T>(data: unknown): T[] {
  return safeArray<T>(data);
}
